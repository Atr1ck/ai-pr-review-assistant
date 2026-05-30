type RightCodeResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type RightCodeRequestInput = {
  prompt: string;
};

function extractOutputText(data: RightCodeResponse) {
  if (typeof data.output_text === 'string') {
    return data.output_text;
  }

  const textParts =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => typeof text === 'string') ?? [];

  return textParts.join('\n').trim();
}

export async function createRightCodeResponse({ prompt }: RightCodeRequestInput) {
  const apiKey = process.env.RIGHTCODE_API_KEY;

  if (!apiKey) {
    throw new Error('RIGHTCODE_API_KEY is required');
  }

  const baseUrl = process.env.RIGHTCODE_BASE_URL ?? 'https://www.right.codes/codex/v1';
  const model = process.env.RIGHTCODE_MODEL ?? 'gpt-5.4';

  const response = await fetch(`${baseUrl}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: false,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  const data = (await response.json()) as RightCodeResponse & {
    error?: { message?: string };
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? data.message ?? 'Right Code request failed',
    );
  }

  const text = extractOutputText(data);

  if (!text) {
    throw new Error('Right Code response did not include output text');
  }

  return text;
}