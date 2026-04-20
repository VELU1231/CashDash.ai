'use client';

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js modules once
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Filler, Tooltip, Legend
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
}

export function AreaChartCard({ labels, datasets, formatValue, height = 240 }: AreaChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const data = {
    labels,
    datasets: datasets.map((ds) => ({
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
}

export function BarChartCard({ labels, data: values, colors, formatValue, height = 200 }: BarChartProps) {
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
