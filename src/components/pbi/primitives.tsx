import React, { ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Canvas Power BI: ogni pagina del report è un piano fisso di 1280x720 px
 * (`displayOption: "FitToPage"`). Le coordinate dei visual nel PBIR sono
 * espresse in queste stesse unità, quindi qui vengono riprodotte 1:1.
 */
export const PBI_CANVAS_WIDTH = 1280;
export const PBI_CANVAS_HEIGHT = 720;

/**
 * Power BI memorizza i font in punti mentre il canvas è espresso in px CSS (96 dpi):
 * 1pt = 96/72 = 4/3 px.
 */
export const fontSizePx = (points: number): string => `${(points * 4) / 3}px`;

/**
 * Palette reale del report: colori letterali presi dai `visual.json` più la
 * risoluzione dei riferimenti `ThemeDataColor` verificata sugli screenshot
 * (ColorId 1 -> #000000, ColorId 1 @ 0.2 -> #333333, ColorId 0 -> #FFFFFF).
 */
export const PBI_COLORS = {
  canvas: '#1B1C1F',
  card: '#2B2D31',
  cardAlt: '#2A2E32',
  panel: '#3B3D45',
  band: '#2B2B2B',
  tableHeader: '#000000',
  tableRowPrimary: '#333333',
  tableRowSecondary: '#2B2B2B',
  button: '#0F1012',
  slicerHeader: '#1A1A1A',
  tileBorder: '#B3B3B3',
  tileSelected: '#000000',
  accent: '#F26D6D',
  textPrimary: '#FFFFFF',
  textLight: '#E6E6E6',
  textMuted: '#B3B3B3',
  good: '#6CC070',
  warn: '#F5C26B',
  mid: '#AD6141',
} as const;

interface PbiCanvasProps {
  children: ReactNode;
}

/**
 * Contenitore FitToPage: mantiene il canvas 1280x720 e lo scala (uniformemente)
 * per riempire al meglio lo spazio disponibile.
 */
export const PbiCanvas: React.FC<PbiCanvasProps> = ({ children }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setScale(Math.min(width / PBI_CANVAS_WIDTH, height / PBI_CANVAS_HEIGHT));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={wrapperRef} className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        style={{
          width: PBI_CANVAS_WIDTH * scale,
          height: PBI_CANVAS_HEIGHT * scale,
          position: 'relative',
          flex: '0 0 auto',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: PBI_CANVAS_WIDTH,
            height: PBI_CANVAS_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            background: PBI_COLORS.canvas,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

interface PbiBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
  onClick?: () => void;
  children?: ReactNode;
}

/** Posiziona un elemento in coordinate assolute del canvas Power BI. */
export const PbiBox: React.FC<PbiBoxProps> = ({
  x, y, w, h, z, className, style, title, onClick, children,
}) => (
  <div
    className={className}
    title={title}
    onClick={onClick}
    style={{ position: 'absolute', left: x, top: y, width: w, height: h, zIndex: z, ...style }}
  >
    {children}
  </div>
);

interface PbiShapeProps {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  fill: string;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
}

/** Riproduce un visual di tipo `shape` (rettangolo riempito). */
export const PbiShape: React.FC<PbiShapeProps> = ({
  fill, radius = 0, stroke, strokeWidth = 0, ...box
}) => (
  <PbiBox
    {...box}
    style={{
      background: fill,
      borderRadius: radius,
      border: stroke ? `${strokeWidth}px solid ${stroke}` : undefined,
    }}
  />
);

type TextAlign = 'left' | 'center' | 'right';
type TextVAlign = 'top' | 'middle' | 'bottom';

interface PbiTextProps {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  text: string;
  sizePt: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: TextAlign;
  vAlign?: TextVAlign;
  background?: string;
  padding?: number;
  lineHeight?: number;
}

/** Riproduce un visual di tipo `textbox` / etichetta di titolo. */
export const PbiText: React.FC<PbiTextProps> = ({
  text, sizePt, color = PBI_COLORS.textLight, bold, italic,
  align = 'left', vAlign = 'top', background, padding = 0, lineHeight = 1.25, ...box
}) => {
  const justify = vAlign === 'middle' ? 'center' : vAlign === 'bottom' ? 'flex-end' : 'flex-start';
  return (
    <PbiBox
      {...box}
      style={{
        background,
        padding,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        justifyContent: justify,
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontSize: fontSizePx(sizePt),
          color,
          fontWeight: bold ? 700 : 400,
          fontStyle: italic ? 'italic' : 'normal',
          textAlign: align,
          lineHeight,
          width: '100%',
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </span>
    </PbiBox>
  );
};

interface PbiTileSlicerProps<T extends string> {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  options: readonly T[];
  value: readonly T[];
  onToggle: (option: T) => void;
  sizePt?: number;
}

/**
 * Riproduce un `advancedSlicerVisual` (modalità tile 2D): ogni valore è una
 * tile con bordo #B3B3B3, riempimento #2B2D31 (default) / #000000 (selezionato).
 */
export function PbiTileSlicer<T extends string>({
  x, y, w, h, z, options, value, onToggle, sizePt = 8,
}: PbiTileSlicerProps<T>) {
  return (
    <PbiBox x={x} y={y} w={w} h={h} z={z} style={{ display: 'flex', gap: 5, overflow: 'hidden' }}>
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            style={{
              flex: '1 1 0',
              minWidth: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              fontSize: fontSizePx(sizePt),
              color: PBI_COLORS.textLight,
              background: selected ? PBI_COLORS.tileSelected : PBI_COLORS.card,
              border: `1px solid ${PBI_COLORS.tileBorder}`,
              borderRadius: 0,
              cursor: 'pointer',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            {option}
          </button>
        );
      })}
    </PbiBox>
  );
}

interface PbiListSlicerProps<T extends string> {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  title: string;
  options: readonly T[];
  value: readonly T[];
  onToggle: (option: T) => void;
  itemColor?: string;
  itemSizePt?: number;
  headerBackground?: string;
  headerColor?: string;
  headerSizePt?: number;
  /** Riproduce `selfFilterEnabled`: casella di ricerca sopra l'elenco dei valori. */
  searchable?: boolean;
}

/**
 * Riproduce un visual di tipo `slicer` (elenco verticale con intestazione):
 * header e elementi traggono i colori dagli oggetti `header`/`items` del PBIR.
 */
export function PbiListSlicer<T extends string>({
  x, y, w, h, z, title, options, value, onToggle,
  itemColor = PBI_COLORS.textMuted,
  itemSizePt = 8,
  headerBackground = PBI_COLORS.slicerHeader,
  headerColor = PBI_COLORS.textMuted,
  headerSizePt = 10,
  searchable = false,
}: PbiListSlicerProps<T>) {
  const [query, setQuery] = useState('');
  const visible = searchable && query
    ? options.filter((option) => option.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <PbiBox x={x} y={y} w={w} h={h} z={z} style={{ background: PBI_COLORS.card, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          background: headerBackground,
          color: headerColor,
          fontSize: fontSizePx(headerSizePt),
          padding: '3px 6px',
          flex: '0 0 auto',
        }}
      >
        {title}
      </div>
      {searchable && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca"
          style={{
            flex: '0 0 auto',
            margin: '2px 4px',
            padding: '1px 4px',
            fontSize: fontSizePx(itemSizePt),
            background: PBI_COLORS.canvas,
            color: PBI_COLORS.textLight,
            border: `1px solid ${PBI_COLORS.panel}`,
            outline: 'none',
          }}
        />
      )}
      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '2px 4px' }}>
        {visible.map((option) => {
          const selected = value.includes(option);
          return (
            <label
              key={option}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '1px 2px',
                fontSize: fontSizePx(itemSizePt),
                color: itemColor,
                cursor: 'pointer',
                background: selected ? 'rgba(242,109,109,0.15)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(option)}
                style={{ width: 10, height: 10, margin: 0, accentColor: PBI_COLORS.accent, cursor: 'pointer' }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option}</span>
            </label>
          );
        })}
      </div>
    </PbiBox>
  );
}

interface PbiButtonProps {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  label: string;
  sizePt?: number;
  disabled?: boolean;
  onClick?: () => void;
  variant?: 'dark' | 'light';
}

/** Riproduce un `actionButton` di Power BI (pillola scura di default o bianca per i drillthrough). */
export const PbiButton: React.FC<PbiButtonProps> = ({
  x, y, w, h, z, label, sizePt = 9, disabled, onClick, variant = 'dark',
}) => {
  const isLight = variant === 'light';
  return (
    <PbiBox x={x} y={y} w={w} h={h} z={z}>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          width: '100%',
          height: '100%',
          background: isLight
            ? (disabled ? '#E1DFDD' : '#FFFFFF')
            : (disabled ? '#16171A' : PBI_COLORS.button),
          color: isLight
            ? (disabled ? '#A19F9D' : '#1E1E1E')
            : (disabled ? '#64748B' : PBI_COLORS.textLight),
          fontSize: fontSizePx(sizePt),
          fontWeight: isLight ? 600 : 500,
          border: isLight
            ? '1px solid rgba(0,0,0,0.25)'
            : '1px solid rgba(255,255,255,0.28)',
          borderRadius: 18,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isLight
            ? '0 2px 6px rgba(0,0,0,0.35)'
            : '0 2px 6px rgba(0,0,0,0.5)',
          transition: 'all 0.15s ease',
        }}
      >
        {label}
      </button>
    </PbiBox>
  );
};

/**
 * Pulsante circolare nativo Power BI "Indietro" con freccia a sinistra,
 * riprodotto esattamente come nei visual del report.
 */
export const PbiBackButton: React.FC<{
  x?: number;
  y?: number;
  z?: number;
  size?: number;
  title?: string;
  onClick: () => void;
}> = ({ x = 15, y = 14, z = 35000, size = 32, title = "Torna alla pagina precedente", onClick }) => (
  <PbiBox x={x} y={y} w={size} h={size} z={z}>
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: '#1F2023',
        border: '1.5px solid rgba(255, 255, 255, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 5px rgba(0,0,0,0.4)',
        padding: 0,
      }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E6E6E6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </button>
  </PbiBox>
);

