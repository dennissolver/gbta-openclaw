import React from 'react';
import Link from 'next/link';

const CheckIcon = ({ included }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 ${included ? 'text-brand-400' : 'text-dark-600'}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingCard({ tier, highlighted }) {
  const {
    name,
    price,
    period,
    description,
    features,
    cta,
    ctaHref,
    ctaMailto,
    badge,
    accent,
  } = tier;

  const cardBase = highlighted
    ? 'relative bg-dark-900 border-2 border-brand-500 rounded-2xl p-8 shadow-2xl shadow-brand-500/20 scale-105 z-10'
    : accent === 'purple'
    ? 'relative bg-dark-900 border border-purple-500/30 rounded-2xl p-8'
    : 'relative bg-dark-900 border border-dark-700 rounded-2xl p-8';

  const ctaClass = highlighted
    ? 'btn-primary w-full text-center text-lg py-3'
    : 'btn-secondary w-full text-center text-lg py-3';

  const ButtonOrLink = () => {
    if (ctaMailto) {
      return (
        <a href={ctaMailto} className={ctaClass}>
          {cta}
        </a>
      );
    }
    return (
      <Link href={ctaHref || '/onboarding'} className={ctaClass}>
        {cta}
      </Link>
    );
  };

  return (
    <div className={cardBase}>
      {/* Gradient top border for highlighted */}
      {highlighted && (
        <div className="absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600 rounded-full -translate-y-0.5" />
      )}

      {/* Badge */}
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="badge-green px-4 py-1 text-sm font-semibold shadow-lg shadow-brand-500/20">
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h3
          className={`text-xl font-bold mb-2 ${
            highlighted ? 'text-brand-400' : accent === 'purple' ? 'text-purple-400' : 'text-white'
          }`}
        >
          {name}
        </h3>
        <div className="flex items-baseline gap-1 mb-3">
          <span className="text-4xl font-bold text-white">${price}</span>
          {period && <span className="text-dark-400 text-lg">/{period}</span>}
        </div>
        <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
      </div>

      {/* CTA */}
      <div className="mb-8">
        <ButtonOrLink />
      </div>

      {/* Features */}
      <ul className="space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            <CheckIcon included={feature.included !== false} />
            <span
              className={`text-sm leading-relaxed ${
                feature.included === false ? 'text-dark-500' : 'text-dark-300'
              }`}
            >
              {feature.label}
              {feature.soon && (
                <span className="ml-1.5 text-xs text-dark-500 italic">(coming soon)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
