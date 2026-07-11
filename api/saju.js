const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function isValidNumberSet(numbers) {
  if (!Array.isArray(numbers) || numbers.length !== 6) return false;
  const unique = new Set(numbers);
  if (unique.size !== 6) return false;
  return numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 지원합니다.' });
    return;
  }

  const { birthDate, birthTime, timeUnknown, calendarType, gender } = req.body || {};
  if (!birthDate) {
    res.status(400).json({ error: '생년월일을 입력해 주세요.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: '서버에 OPENAI_API_KEY가 설정되어 있지 않습니다.' });
    return;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

  const calendarLabel = calendarType === 'lunar' ? '음력' : '양력';
  const genderLabel = gender === 'male' ? '남성' : '여성';
  const timeLabel = timeUnknown || !birthTime ? '모름' : birthTime;

  const prompt = `생년월일: ${birthDate} (${calendarLabel})\n성별: ${genderLabel}\n태어난 시간: ${timeLabel}\n\n` +
    '위 생년월일(양력/음력 구분 참고), 성별, 태어난 시간을 바탕으로 사주(四柱) 분석을 재미로 짧게 해줘. ' +
    '태어난 시간을 모르면 시주(時柱)를 제외하고 나머지 정보로만 분석해줘. ' +
    '그리고 그 분석 내용과 어울리는 로또 6/45 번호 6개(1~45, 중복 없이)를 추천해줘. ' +
    '반드시 아래 JSON 형식으로만 답해:\n' +
    '{"analysis": "3~4문장의 사주 분석 요약", "numbers": [1부터 45 사이 중복 없는 정수 6개]}';

  try {
    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: '너는 재미로 사주 운세를 보고 로또 번호를 추천해주는 챗봇이다. 실제 운명이나 재정적 조언이 아닌 엔터테인먼트 목적임을 항상 전제로 한다.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      res.status(502).json({ error: `OpenAI 호출 실패: ${errText}` });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    if (!parsed.analysis || !isValidNumberSet(parsed.numbers)) {
      res.status(502).json({ error: 'AI 응답 형식이 올바르지 않습니다.' });
      return;
    }

    res.status(200).json({
      analysis: parsed.analysis,
      numbers: [...parsed.numbers].sort((a, b) => a - b),
    });
  } catch (err) {
    res.status(500).json({ error: `서버 오류: ${err.message}` });
  }
};
