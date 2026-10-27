import React from 'react';
import {
  PbiCanvas,
  PbiBox,
  PbiText,
  PBI_COLORS,
  fontSizePx,
} from '../pbi/primitives';

const PANEL_BG = '#3A3D44';
const BTN_TEXT = '#D4D4D3';

export const PageQuickUserGuide: React.FC = () => {
  const pdfUrl = '/Quick_User_Guide.pdf';

  return (
    <PbiCanvas>
      {/* z=1000: Title */}
      <PbiText
        x={377}
        y={239}
        w={525.04}
        h={66.2}
        z={1000}
        text="Quick User Guide"
        sizePt={44}
        bold
        color={PBI_COLORS.accent}
        align="center"
        vAlign="middle"
      />

      {/* z=2001: Shape "Apri" (group child, absolute pos = group + relative) */}
      <PbiBox
        x={517.22}
        y={352.22}
        w={245.56}
        h={93.33}
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
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 40,
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <span style={{ fontSize: fontSizePx(32), color: BTN_TEXT }}>
            Apri
          </span>
        </a>
      </PbiBox>

      {/* z=2002: Image (Designer.png -> logo, group child, absolute pos) */}
      <PbiBox
        x={559.36}
        y={375.08}
        w={255.71}
        h={50}
        z={2002}
      >
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', width: '100%', height: '100%' }}
        >
          <img
            src="/assets/logo_ufficiale.png"
            alt="Quick User Guide"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </a>
      </PbiBox>
    </PbiCanvas>
  );
};
