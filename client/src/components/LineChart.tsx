import { useMemo } from 'react';

interface DataPoint {
  week: string;
  value: number;
  date?: Date;
}

interface LineChartProps {
  data: DataPoint[];
  dataKey: string;
  color: string;
  title: string;
  unit?: string;
  yAxisMin?: number;
  yAxisMax?: number;
}

export function LineChart({ 
  data, 
  color, 
  title, 
  unit = '', 
  yAxisMin, 
  yAxisMax 
}: LineChartProps) {
  const { chartData, maxValue, minValue, yMin, yMax } = useMemo(() => {
    if (data.length === 0) {
      return { chartData: [], maxValue: 0, minValue: 0, yMin: 0, yMax: 100 };
    }

    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Add padding to min/max for better visualization
    const padding = (max - min) * 0.1;
    const computedYMin = yAxisMin !== undefined ? yAxisMin : Math.max(0, min - padding);
    const computedYMax = yAxisMax !== undefined ? yAxisMax : max + padding;

    return {
      chartData: data,
      maxValue: max,
      minValue: min,
      yMin: computedYMin,
      yMax: computedYMax
    };
  }, [data, yAxisMin, yAxisMax]);

  if (chartData.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">No data available</div>
          <div className="text-sm">Upload CSV data to see {title.toLowerCase()}</div>
        </div>
      </div>
    );
  }

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 60, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate points for the line
  const points = chartData.map((point, index) => {
    const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((point.value - yMin) / (yMax - yMin)) * chartHeight;
    return { x, y, value: point.value, week: point.week };
  });

  // Generate path for the line
  const pathData = points.reduce((path, point, index) => {
    return path + (index === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
  }, '');

  // Generate Y-axis labels
  const yAxisTicks = 5;
  const yLabels = Array.from({ length: yAxisTicks }, (_, i) => {
    const value = yMin + (yMax - yMin) * (i / (yAxisTicks - 1));
    return {
      value,
      y: padding.top + chartHeight - (i / (yAxisTicks - 1)) * chartHeight,
      label: value.toFixed(1)
    };
  });

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      
      <div className="relative bg-white border rounded-lg p-4 overflow-x-auto">
        <svg
          width={width}
          height={height}
          className="w-full h-auto"
          style={{ minWidth: '600px' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f1f5f9" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect 
            x={padding.left} 
            y={padding.top} 
            width={chartWidth} 
            height={chartHeight} 
            fill="url(#grid)" 
          />

          {/* Y-axis */}
          <line 
            x1={padding.left} 
            y1={padding.top} 
            x2={padding.left} 
            y2={padding.top + chartHeight} 
            stroke="#94a3b8" 
            strokeWidth="1"
          />

          {/* X-axis */}
          <line 
            x1={padding.left} 
            y1={padding.top + chartHeight} 
            x2={padding.left + chartWidth} 
            y2={padding.top + chartHeight} 
            stroke="#94a3b8" 
            strokeWidth="1"
          />

          {/* Y-axis labels */}
          {yLabels.map((label, index) => (
            <g key={index}>
              <text
                x={padding.left - 10}
                y={label.y + 4}
                textAnchor="end"
                className="text-xs fill-slate-600"
              >
                {label.label}{unit}
              </text>
              <line
                x1={padding.left - 3}
                y1={label.y}
                x2={padding.left}
                y2={label.y}
                stroke="#94a3b8"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* X-axis labels */}
          {points.map((point, index) => (
            <g key={index}>
              <text
                x={point.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                className="text-xs fill-slate-600"
              >
                {point.week}
              </text>
              <line
                x1={point.x}
                y1={padding.top + chartHeight}
                x2={point.x}
                y2={padding.top + chartHeight + 3}
                stroke="#94a3b8"
                strokeWidth="1"
              />
            </g>
          ))}

          {/* Data line */}
          <path
            d={pathData}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <g key={index}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill={color}
                className="hover:r-6 cursor-pointer transition-all"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="12"
                fill="transparent"
                className="cursor-pointer"
              >
                <title>{`${point.week}: ${point.value.toFixed(1)}${unit}`}</title>
              </circle>
            </g>
          ))}

          {/* Trend line area (optional gradient fill) */}
          <defs>
            <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.1"/>
              <stop offset="100%" stopColor={color} stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path
            d={`${pathData} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
            fill={`url(#gradient-${color.replace('#', '')})`}
          />
        </svg>
      </div>

      {/* Chart summary */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="text-sm text-slate-600">Current</div>
          <div className="font-semibold" style={{ color }}>
            {chartData[chartData.length - 1]?.value.toFixed(1)}{unit}
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="text-sm text-slate-600">Average</div>
          <div className="font-semibold text-slate-700">
            {(chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length).toFixed(1)}{unit}
          </div>
        </div>
        <div className="bg-slate-50 p-3 rounded-lg">
          <div className="text-sm text-slate-600">Range</div>
          <div className="font-semibold text-slate-700">
            {minValue.toFixed(1)} - {maxValue.toFixed(1)}{unit}
          </div>
        </div>
      </div>
    </div>
  );
}