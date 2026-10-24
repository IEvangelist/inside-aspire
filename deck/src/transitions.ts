const styles = ['none', 'fade', 'slide', 'convex', 'concave', 'zoom'] as const;
const speeds = ['default', 'fast', 'slow'] as const;
type Speed = typeof speeds[number];
type Transition = { style: string; speed: string; background: string };
type Settings = { defaults: Transition; chapters: Record<string, Partial<Transition>> };

export const transitionSettings: Settings = {
  defaults: { style: 'fade', speed: 'fast', background: 'none' },
  chapters: {
    'AI loops': { style: 'fade', speed: 'fast' },
    'Aspire dashboard': { style: 'fade', speed: 'default', background: 'fade' },
    'Aspire deployment': { style: 'fade', speed: 'fast', background: 'fade' },
  },
};

function style(value: string, scope: string, directional = false): string {
  if (styles.some((candidate) => candidate === value)) return value;
  const parts = value.split(/\s+/);
  if (directional && parts.length === 2 &&
      parts[0].endsWith('-in') && parts[1].endsWith('-out') &&
      styles.some((candidate) => candidate !== 'none' && `${candidate}-in` === parts[0]) &&
      styles.some((candidate) => candidate !== 'none' && `${candidate}-out` === parts[1])) return value;
  throw new Error(`Transitions: ${scope}: invalid style "${value}". Use a native style or a style-in style-out slide pair.`);
}

function speed(value: string, scope: string): Speed {
  const result = speeds.find((candidate) => candidate === value);
  if (!result) throw new Error(`Transitions: ${scope}: invalid speed "${value}".`);
  return result;
}

export function validateTransitionSettings(settings: Settings, chapters: ReadonlySet<string | undefined>) {
  const defaultStyle = style(settings.defaults.style, 'deck default');
  const globalStyle = styles.find((candidate) => candidate === defaultStyle)!;
  const defaultBackground = style(settings.defaults.background, 'deck background');
  const globalBackground = styles.find((candidate) => candidate === defaultBackground)!;
  const defaultSpeed = speed(settings.defaults.speed, 'deck default');
  for (const [chapter, values] of Object.entries(settings.chapters)) {
    if (!chapters.has(chapter)) throw new Error(`Transitions: chapter "${chapter}" has no real leaf slides.`);
    if (values.style !== undefined) style(values.style, `chapter "${chapter}"`, true);
    if (values.speed !== undefined) speed(values.speed, `chapter "${chapter}"`);
    if (values.background !== undefined) style(values.background, `chapter "${chapter}" background`);
  }
  return { globalStyle, globalBackground, defaultSpeed, defaultBackground };
}

export function createTransitionPolicy(root: HTMLElement, slides: HTMLElement[], settings: Settings) {
  const { globalStyle, globalBackground, defaultSpeed, defaultBackground } =
    validateTransitionSettings(settings, new Set(slides.map((slide) => slide.dataset.chapter)));
  const effective = slides.map((slide) => {
    const chapter = settings.chapters[slide.dataset.chapter ?? ''] ?? {};
    return {
      slide,
      style: style(slide.getAttribute('data-transition') ?? chapter.style ?? settings.defaults.style, `slide "${slide.id}"`, true),
      speed: speed(slide.getAttribute('data-transition-speed') ?? chapter.speed ?? defaultSpeed, `slide "${slide.id}"`),
      background: style(slide.getAttribute('data-background-transition') ?? chapter.background ?? defaultBackground, `slide "${slide.id}" background`),
    };
  });
  return {
    apply(noMotion: boolean) {
      root.ownerDocument.documentElement.dataset.motion = noMotion ? 'none' : 'native';
      for (const values of effective) {
        values.slide.dataset.transition = noMotion ? 'none' : values.style;
        values.slide.dataset.transitionSpeed = noMotion ? 'default' : values.speed;
        values.slide.dataset.backgroundTransition = noMotion ? 'none' : values.background;
      }
      return {
        transition: noMotion ? 'none' as const : globalStyle,
        transitionSpeed: noMotion ? 'default' as const : defaultSpeed,
        backgroundTransition: noMotion ? 'none' as const : globalBackground,
      };
    },
  };
}
