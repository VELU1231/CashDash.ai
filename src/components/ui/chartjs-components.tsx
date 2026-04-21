'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut, Chart as ReactChart } from 'react-chartjs-2';

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
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend,
  ChartDataLabels, annotationPlugin, zoomPlugin, trendlinePlugin,
  TreemapController, TreemapElement, MatrixController, MatrixElement
);

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
              content: `Budget: ${formatValue ? formatValue(budgetLimit) : budgetLimit}`,
              position: 'end' as const,
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              font: { size: 10, weight: 'bold' as const }
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
      <Line data={data} options={options} />
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
              content: `Budget: ${formatValue ? formatValue(budgetLimit) : budgetLimit}`,
              position: 'end' as const,
              backgroundColor: 'rgba(239, 68, 68, 0.9)',
              font: { size: 10, weight: 'bold' as const }
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
      borderWidth: 0,
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
        color: ['#fff', 'rgba(255,255,255,0.7)'],
        font: [{ size: 12, weight: 'bold' as const }, { size: 10 }]
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
