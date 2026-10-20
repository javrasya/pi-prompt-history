const PI_EXPANDED_SKILL_PATTERN =
  /^<skill name="([^"]+)" location="[^"]+">\n[\s\S]*?\n<\/skill>(?:\n\n([\s\S]+))?$/;

export function collapseSkillBlock(text: string): string {
  const match = text.match(PI_EXPANDED_SKILL_PATTERN);
  if (!match) {
    return text;
  }

  const name = match[1];
  const args = match[2]?.trim();
  return args ? `/skill:${name} ${args}` : `/skill:${name}`;
}
