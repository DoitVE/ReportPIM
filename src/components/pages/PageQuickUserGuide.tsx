import React from 'react';
import {
  PbiCanvas,
  PbiBox,
  PbiText,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

const PANEL_BG = '#3A3D44';
const BTN_TEXT = '#EAEAEA';

export const PageQuickUserGuide: React.FC = () => {
  const pdfUrl = '/Quick_User_Guide.pdf';

  return (
    <PbiCanvas>
      {/* Title */}
      <PbiText
        x={377}
        y={230}
        w={526}
        h={70}
        z={1000}
        text="Quick User Guide"
        sizePt={44}
        bold
        color={PBI_COLORS.accent}
        align="center"
        vAlign="middle"
      />

      {/* Button "Apri [PDF]" matching Power BI original screenshot */}
      <PbiBox
        x={500}
        y={350}
        w={280}
        h={90}
        z={2001}
      >
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: PANEL_BG,
            borderRadius: 24,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            textDecoration: 'none',
            boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            transition: 'transform 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#454852';
            e.currentTarget.style.transform = 'scale(1.02)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = PANEL_BG;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <span style={{ fontSize: fontSizePx(32), color: BTN_TEXT, fontWeight: 500 }}>
            Apri
          </span>
          {/* Authentic red PDF document badge icon */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#D92D20',
              borderRadius: 6,
              width: 38,
              height: 44,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Top document folded corner mark */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 10,
                height: 10,
                background: 'rgba(255,255,255,0.4)',
                borderBottomLeftRadius: 4,
              }}
            />
            {/* Document lines */}
            <div style={{ width: 18, height: 2, background: 'rgba(255,255,255,0.85)', marginBottom: 3 }} />
            <div style={{ width: 14, height: 2, background: 'rgba(255,255,255,0.85)', marginBottom: 5 }} />
            <span
              style={{
                fontSize: 9,
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: 0.5,
                lineHeight: 1,
              }}
            >
              PDF
            </span>
          </div>
        </a>
      </PbiBox>
    </PbiCanvas>
  );
};

export default PageQuickUserGuide;
