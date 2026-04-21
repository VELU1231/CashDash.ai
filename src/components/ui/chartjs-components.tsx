'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend, Decimation,
} from 'chart.js';
import { Line, Bar, Doughnut, Pie, Radar, PolarArea, Scatter, Bubble, Chart as ReactChart } from 'react-chartjs-2';

// Advanced Plugins
import ChartDataLabels from 'chartjs-plugin-datalabels';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
// @ts-ignore
import trendlinePlugin from 'chartjs-plugin-trendline';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

// Register Chart.js modules once
ChartJS.register(
  CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend, Decimation,
  annotationPlugin, zoomPlugin, trendlinePlugin,
  TreemapController, TreemapElement, MatrixController, MatrixElement
);

// Custom Premium Shadow Plugin
const shadowPlugin = {
  id: 'premiumShadow',
  beforeDraw: (chart: any) => {
    const { ctx } = chart;
    const _originalStroke = ctx.stroke;
    ctx.stroke = function() {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;
      _originalStroke.apply(this, arguments);
      ctx.restore();
    };
  }
};

// Shared tooltip styling
const tooltipConfig = {
  backgroundColor: 'rgba(20, 17, 14, 0.92)',
  titleColor: '#E2D8C4',
  bodyColor: '#E2D8C4',
  borderColor: 'rgba(226, 216, 196, 0.1)',
  borderWidth: 1,
  cornerRadius: 12,
  padding: 12,
  titleFont: { size: 12, weight: 'bold' as const },
  bodyFont: { size: 11 },
  displayColors: true,
  boxPadding: 4,
};

const gridColor = 'rgba(128, 128, 128, 0.06)';

// Advanced Global Config
ChartJS.defaults.devicePixelRatio = typeof window !== 'undefined' && window.devicePixelRatio > 1 ? 2 : 1;
ChartJS.defaults.layout.padding = 4;
ChartJS.defaults.font.family = 'system-ui, -apple-system, sans-serif';

// Canvas Background Plugin
export const canvasBackgroundPlugin = {
  id: 'canvasBackground',
  beforeDraw: (chart: any, args: any, options: any) => {
    if (!options.color) return;
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = options.color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
};
ChartJS.register(canvasBackgroundPlugin);

// ─── AREA / LINE CHART ───────────────────────────────────────────
interface AreaChartProps {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    bgFrom: string;
    bgTo?: string;
  }[];
  formatValue?: (v: number) => string;
  height?: number;
  showTrendline?: boolean;
  budgetLimit?: number;
}

export function AreaChartCard({ labels, datasets, formatValue, height = 240, showTrendline = false, budgetLimit }: AreaChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const data = {
    labels,
    datasets: datasets.map((ds, idx) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor,
      borderWidth: 2.5,
      pointRadius: 4,
      pointHoverRadius: 7,
      pointBackgroundColor: ds.borderColor,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      tension: 0.4,
      fill: true,
      backgroundColor: (ctx: any) => {
        const chart = ctx.chart;
        const { ctx: context, chartArea } = chart;
        if (!chartArea) return ds.bgFrom;
        const gradient = context.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
        gradient.addColorStop(0, ds.bgFrom);
        gradient.addColorStop(1, ds.bgTo || 'rgba(0,0,0,0)');
        return gradient;
      },
      trendlineLinear: showTrendline && idx === 0 ? {
        style: ds.borderColor,
        lineStyle: "dotted",
        width: 2
      } : undefined
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.parsed.y) : ctx.parsed.y;
            return `  ${ctx.dataset.label}: ${val}`;
          },
        },
      },
      annotation: budgetLimit ? {
        annotations: {
          budgetLine: {
            type: 'line' as const,
            yMin: budgetLimit,
            yMax: budgetLimit,
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              display: true,
              content: `Budget Limit`,
              position: 'end' as const,
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              font: { size: 10, weight: 'bold' as const },
              padding: 4,
              borderRadius: 4
            }
          }
        }
      } : undefined
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 11 } },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: 'rgba(128,128,128,0.6)',
          font: { size: 11 },
          callback: (v: any) => formatValue ? formatValue(v) : v,
        },
        border: { display: false },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' as const },
  };

  return (
    <div style={{ height }}>
      <Line data={data} options={options} plugins={[shadowPlugin]} />
    </div>
  );
}

// ─── BAR CHART ───────────────────────────────────────────────────
interface BarChartProps {
  labels: string[];
  data: number[];
  colors?: string[];
  formatValue?: (v: number) => string;
  height?: number;
  budgetLimit?: number;
}

export function BarChartCard({ labels, data: values, colors, formatValue, height = 200, budgetLimit }: BarChartProps) {
  const defaultColors = values.map((v) => v >= 0 ? '#10b981' : '#f87171');

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors || defaultColors,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 36,
      hoverBackgroundColor: (colors || defaultColors).map((c: string) =>
        c.replace(')', ', 0.8)').replace('rgb', 'rgba').replace('rgba,', 'rgba(')
      ),
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => formatValue ? formatValue(ctx.parsed.y) : ctx.parsed.y,
        },
      },
      annotation: budgetLimit ? {
        annotations: {
          budgetLine: {
            type: 'line' as const,
            yMin: budgetLimit,
            yMax: budgetLimit,
            borderColor: 'rgba(239, 68, 68, 0.8)',
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              display: true,
              content: `Budget Limit`,
              position: 'end' as const,
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              font: { size: 10, weight: 'bold' as const },
              padding: 4,
              borderRadius: 4
            }
          }
        }
      } : undefined
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 10 } },
        border: { display: false },
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: 'rgba(128,128,128,0.6)',
          font: { size: 10 },
          callback: (v: any) => formatValue ? formatValue(v) : v,
        },
        border: { display: false },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' as const },
  };

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// ─── DOUGHNUT CHART ──────────────────────────────────────────────
interface DoughnutChartProps {
  labels: string[];
  data: number[];
  colors: string[];
  centerLabel?: string;
  centerValue?: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function DoughnutChartCard({ labels, data: values, colors, centerLabel, centerValue, height = 200, formatValue }: DoughnutChartProps) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderWidth: 0,
      hoverBorderWidth: 2,
      hoverBorderColor: '#fff',
      spacing: 3,
    }],
  };

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw(chart: any) {
      if (!centerValue) return;
      const { ctx, chartArea } = chart;
      const cx = (chartArea.left + chartArea.right) / 2;
      const cy = (chartArea.top + chartArea.bottom) / 2;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Value
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--foreground') ? '#E2D8C4' : '#1A130C';
      ctx.fillText(centerValue, cx, cy - 8);

      // Label
      if (centerLabel) {
        ctx.font = '11px system-ui, sans-serif';
        ctx.fillStyle = 'rgba(128,128,128,0.7)';
        ctx.fillText(centerLabel, cx, cy + 12);
      }
      ctx.restore();
    },
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.parsed) : ctx.parsed;
            return `  ${ctx.label}: ${val}`;
          },
        },
      },
    },
    animation: { duration: 1000, easing: 'easeOutQuart' as const, animateRotate: true },
  };

  return (
    <div style={{ height }}>
      <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
}

// ─── TREEMAP CHART ─────────────────────────────────────────────────
export interface TreemapChartProps {
  data: any[]; // Expecting an array of objects
  keyField: string;
  valueField: string;
  colorField?: string;
  colors?: string[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function TreemapChartCard({ data: treeData, keyField, valueField, colorField, colors, height = 240, formatValue }: TreemapChartProps) {
  const data = {
    datasets: [{
      tree: treeData,
      key: valueField,
      groups: [keyField],
      spacing: 2,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      backgroundColor(ctx: any) {
        if (ctx.type !== 'data') return 'transparent';
        if (colorField && ctx.raw._data[colorField]) return ctx.raw._data[colorField];
        return colors ? colors[ctx.dataIndex % colors.length] : '#10b981';
      },
      labels: {
        align: 'left',
        display: true,
        formatter(ctx: any) {
          if (ctx.type !== 'data') return [];
          const name = ctx.raw._data[keyField];
          const val = formatValue ? formatValue(ctx.raw.v) : ctx.raw.v;
          return [name, val];
        },
        color: ['#fff', 'rgba(255,255,255,0.85)'],
        font: [{ size: 14, weight: 'bold' as const, family: 'serif' }, { size: 11, family: 'mono' }]
      }
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          title: (items: any) => items[0].raw._data[keyField],
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw.v) : ctx.raw.v;
            return `Value: ${val}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      {/* @ts-ignore - Type mismatch in react-chartjs-2 for custom types */}
      <ReactChart type="treemap" data={data} options={options} />
    </div>
  );
}

// ─── MATRIX / HEATMAP CHART ──────────────────────────────────────
export interface MatrixChartProps {
  data: { x: string; y: string; v: number }[];
  xLabels: string[];
  yLabels: string[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function MatrixChartCard({ data: matrixData, xLabels, yLabels, height = 240, formatValue }: MatrixChartProps) {
  const data = {
    datasets: [{
      label: 'Activity',
      data: matrixData,
      backgroundColor(ctx: any) {
        const value = ctx.dataset.data[ctx.dataIndex]?.v;
        if (!value) return 'rgba(16, 185, 129, 0.05)';
        // Heatmap intensity (simplified logic)
        const alpha = Math.min(0.1 + (value / 100), 1);
        return `rgba(16, 185, 129, ${alpha})`;
      },
      width(ctx: any) { return (ctx.chart.chartArea || {}).width / xLabels.length - 2; },
      height(ctx: any) { return (ctx.chart.chartArea || {}).height / yLabels.length - 2; },
      borderRadius: 4,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          title: (items: any) => `${items[0].raw.y} - ${items[0].raw.x}`,
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw.v) : ctx.raw.v;
            return `Value: ${val}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category' as const,
        labels: xLabels,
        grid: { display: false },
        ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 10 } },
        border: { display: false },
      },
      y: {
        type: 'category' as const,
        labels: yLabels,
        grid: { display: false },
        ticks: { color: 'rgba(128,128,128,0.6)', font: { size: 10 } },
        border: { display: false },
      }
    }
  };

  return (
    <div style={{ height }}>
      {/* @ts-ignore */}
      <ReactChart type="matrix" data={data} options={options} />
    </div>
  );
}

// ─── RADAR CHART ─────────────────────────────────────────────────
interface RadarChartProps {
  labels: string[];
  datasets: { label: string; data: number[]; color: string }[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function RadarChartCard({ labels, datasets, height = 300, formatValue }: RadarChartProps) {
  const data = {
    labels,
    datasets: datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color.replace('rgb', 'rgba').replace(')', ', 0.2)').replace('rgba,', 'rgba('),
      borderColor: ds.color,
      pointBackgroundColor: ds.color,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: ds.color,
      borderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: gridColor },
        grid: { color: gridColor },
        pointLabels: { color: 'rgba(128,128,128,0.8)', font: { size: 11, family: 'system-ui' } },
        ticks: { display: false } // Hide ticks for cleaner look
      }
    },
    plugins: {
      legend: { position: 'bottom' as const, labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw) : ctx.raw;
            return `  ${ctx.dataset.label}: ${val}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Radar data={data} options={options} plugins={[shadowPlugin]} />
    </div>
  );
}

// ─── POLAR AREA CHART ────────────────────────────────────────────
interface PolarAreaProps {
  labels: string[];
  data: number[];
  colors: string[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function PolarAreaChartCard({ labels, data: values, colors, height = 300, formatValue }: PolarAreaProps) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors.map(c => c.replace('rgb', 'rgba').replace(')', ', 0.6)').replace('rgba,', 'rgba(')),
      borderColor: colors,
      borderWidth: 1,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        grid: { color: gridColor },
        ticks: { display: false }
      }
    },
    plugins: {
      legend: { position: 'right' as const, labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw) : ctx.raw;
            return `  ${ctx.label}: ${val}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <PolarArea data={data} options={options} />
    </div>
  );
}

// ─── SCATTER CHART ───────────────────────────────────────────────
interface ScatterChartProps {
  datasets: { label: string; data: { x: number; y: number }[]; color: string }[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function ScatterChartCard({ datasets, height = 300, formatValue }: ScatterChartProps) {
  const data = {
    datasets: datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color,
      pointRadius: 5,
      pointHoverRadius: 8,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      decimation: { enabled: true, algorithm: 'lttb' as const },
      legend: { position: 'top' as const, labels: { usePointStyle: true } },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw.y) : ctx.raw.y;
            return `  ${ctx.dataset.label}: ${val} (Day ${ctx.raw.x})`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        grid: { display: false },
        title: { display: true, text: 'Day of Month', color: 'rgba(128,128,128,0.5)', font: { size: 10 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { callback: (v: any) => formatValue ? formatValue(v) : v }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Scatter data={data} options={options} plugins={[shadowPlugin]} />
    </div>
  );
}

// ─── BUBBLE CHART ────────────────────────────────────────────────
interface BubbleChartProps {
  datasets: { label: string; data: { x: number; y: number; r: number }[]; color: string }[];
  height?: number;
  formatValue?: (v: number) => string;
}

export function BubbleChartCard({ datasets, height = 300, formatValue }: BubbleChartProps) {
  const data = {
    datasets: datasets.map(ds => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color.replace('rgb', 'rgba').replace(')', ', 0.6)').replace('rgba,', 'rgba('),
      borderColor: ds.color,
      borderWidth: 1,
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw.y) : ctx.raw.y;
            return `  ${ctx.dataset.label}: ${val} (${ctx.raw.x} txns)`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        title: { display: true, text: 'Transaction Count', color: 'rgba(128,128,128,0.5)', font: { size: 10 } }
      },
      y: {
        grid: { color: gridColor },
        title: { display: true, text: 'Total Amount', color: 'rgba(128,128,128,0.5)', font: { size: 10 } },
        ticks: { callback: (v: any) => formatValue ? formatValue(v) : v }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Bubble data={data} options={options} />
    </div>
  );
}

// ─── PIE CHART ───────────────────────────────────────────────────
export function PieChartCard({ labels, data: values, colors, height = 240, formatValue }: PolarAreaProps) {
  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderWidth: 0,
      hoverOffset: 4,
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { usePointStyle: true, boxWidth: 8 } },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.parsed) : ctx.parsed;
            return `  ${ctx.label}: ${val}`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height }}>
      <Pie data={data} options={options} plugins={[shadowPlugin]} />
    </div>
  );
}

// ─── MIXED CHART ─────────────────────────────────────────────────
interface MixedChartProps {
  labels: string[];
  barData: number[];
  lineData: number[];
  barColor: string;
  lineColor: string;
  height?: number;
  formatValue?: (v: number) => string;
}

export function MixedChartCard({ labels, barData, lineData, barColor, lineColor, height = 300, formatValue }: MixedChartProps) {
  const data = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Net Flow',
        data: lineData,
        borderColor: lineColor,
        borderWidth: 3,
        pointBackgroundColor: lineColor,
        pointBorderColor: '#fff',
        pointRadius: 4,
        tension: 0.4,
      },
      {
        type: 'bar' as const,
        label: 'Expenses',
        data: barData,
        backgroundColor: barColor,
        borderRadius: 4,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const, labels: { usePointStyle: true } },
      tooltip: {
        ...tooltipConfig,
        callbacks: {
          label: (ctx: any) => {
            const val = formatValue ? formatValue(ctx.raw) : ctx.raw;
            return `  ${ctx.dataset.label}: ${val}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: gridColor }, ticks: { callback: (v: any) => formatValue ? formatValue(v) : v } }
    }
  };

  return (
    <div style={{ height }}>
      <ReactChart type="bar" data={data} options={options} plugins={[shadowPlugin]} />
    </div>
  );
}

