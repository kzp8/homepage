export default function GlassDistortionFilter() {
  return (
    <svg style={{ display: "none" }} aria-hidden="true">
      <filter id="glass-distortion">
        <feTurbulence type="turbulence" baseFrequency="0.008" numOctaves="2" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="77" />
      </filter>
    </svg>
  );
}
