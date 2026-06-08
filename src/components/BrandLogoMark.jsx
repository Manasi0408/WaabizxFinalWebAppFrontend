const LOGO_SRC = '/LogoWaabizx.png';

const IMG_SIZE_CLASS = {
  xs: 'h-4 max-w-[72px]',
  sm: 'h-7 max-w-[96px]',
  md: 'h-8 max-w-[110px]',
  lg: 'h-9 max-w-[120px]',
  xl: 'h-10 max-w-[128px]',
  '2xl': 'h-11 max-w-[140px]',
};

const SURFACE_PAD_CLASS = {
  xs: 'p-0.5 rounded-md',
  sm: 'p-1 rounded-lg',
  md: 'p-1 rounded-lg',
  lg: 'p-1.5 rounded-xl',
  xl: 'p-1.5 rounded-xl',
  '2xl': 'p-2 rounded-xl',
};

/**
 * @param {'auto' | 'contrast'} tone — `contrast` for always-dark or colored bars (auth, sidebar, WhatsApp preview)
 */
function BrandLogoMark({ size = 'md', className = '', surface = true, tone = 'auto' }) {
  const imgClass = IMG_SIZE_CLASS[size] || IMG_SIZE_CLASS.md;
  const padClass = SURFACE_PAD_CLASS[size] || SURFACE_PAD_CLASS.md;
  const contrastClass = tone === 'contrast' ? 'brand-logo-mark--contrast' : '';

  const image = (
    <img src={LOGO_SRC} alt="Waabizx" className={`brand-logo-mark__img ${imgClass}`} />
  );

  if (!surface) {
    return (
      <span className={`inline-flex shrink-0 items-center justify-center ${className}`.trim()}>
        {image}
      </span>
    );
  }

  return (
    <span
      className={`brand-logo-mark ${contrastClass} ${padClass} ${className}`.trim()}
    >
      {image}
    </span>
  );
}

export function BrandLogoWatermark({ className = '' }) {
  return (
    <img
      src={LOGO_SRC}
      alt=""
      aria-hidden
      className={`brand-logo-watermark ${className}`.trim()}
    />
  );
}

export default BrandLogoMark;
