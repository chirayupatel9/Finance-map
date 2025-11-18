import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TreemapNode, Stock } from '../types';

interface TreemapProps {
  data: TreemapNode;
  width: number;
  height: number;
}

interface TooltipData {
  x: number;
  y: number;
  stock: Stock;
}

export const Treemap: React.FC<TreemapProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  useEffect(() => {
    if (!svgRef.current || !data) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create treemap layout
    const treemapLayout = d3.treemap<TreemapNode>()
      .size([width, height])
      .paddingOuter(3)
      .paddingTop(19)
      .paddingInner(1)
      .round(true);

    // Create hierarchy
    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    treemapLayout(root);

    // Color scale based on change percentage
    const colorScale = (changePercent: number) => {
      if (changePercent > 3) return '#00AA00';
      if (changePercent > 2) return '#22BB22';
      if (changePercent > 1) return '#44CC44';
      if (changePercent > 0) return '#66DD66';
      if (changePercent > -1) return '#FF6666';
      if (changePercent > -2) return '#FF4444';
      if (changePercent > -3) return '#DD2222';
      return '#BB0000';
    };

    // Create groups for each node
    const nodes = svg
      .selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    nodes
      .append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => colorScale(d.data.changePercent))
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseenter', function(event, d) {
        d3.select(this)
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        if (d.data.stock) {
          setTooltip({
            x: event.pageX,
            y: event.pageY,
            stock: d.data.stock
          });
        }
      })
      .on('mousemove', function(event) {
        setTooltip(prev => prev ? { ...prev, x: event.pageX, y: event.pageY } : null);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('stroke', '#1a1a1a')
          .attr('stroke-width', 1);
        setTooltip(null);
      });

    // Add stock symbol text
    nodes
      .append('text')
      .attr('x', 4)
      .attr('y', 16)
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width < 50 || height < 30) return '';
        return d.data.name;
      })
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)');

    // Add percentage text
    nodes
      .append('text')
      .attr('x', 4)
      .attr('y', 30)
      .text(d => {
        const width = d.x1 - d.x0;
        const height = d.y1 - d.y0;
        if (width < 60 || height < 40) return '';
        return `${d.data.changePercent >= 0 ? '+' : ''}${d.data.changePercent.toFixed(2)}%`;
      })
      .attr('font-size', '11px')
      .attr('fill', 'white')
      .style('pointer-events', 'none')
      .style('text-shadow', '1px 1px 2px rgba(0,0,0,0.8)');

    // Add sector labels
    const sectors = svg
      .selectAll('.sector')
      .data(root.children || [])
      .enter()
      .append('g')
      .attr('class', 'sector');

    sectors
      .append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', 19)
      .attr('fill', '#2a2a2a')
      .attr('stroke', '#1a1a1a')
      .attr('stroke-width', 1);

    sectors
      .append('text')
      .attr('x', d => d.x0 + 6)
      .attr('y', d => d.y0 + 14)
      .text(d => d.data.name)
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .style('pointer-events', 'none');

  }, [data, width, height]);

  return (
    <>
      <svg ref={svgRef} width={width} height={height} />
      {tooltip && (
        <div
          className="absolute bg-gray-900 text-white p-3 rounded-lg shadow-xl border border-gray-700 pointer-events-none z-50"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y + 10}px`,
          }}
        >
          <div className="font-bold text-lg">{tooltip.stock.symbol}</div>
          <div className="text-sm text-gray-300">{tooltip.stock.name}</div>
          <div className="mt-2 space-y-1 text-sm">
            <div>Price: ${tooltip.stock.price.toFixed(2)}</div>
            <div className={tooltip.stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
              Change: {tooltip.stock.changePercent >= 0 ? '+' : ''}{tooltip.stock.changePercent.toFixed(2)}%
              ({tooltip.stock.change >= 0 ? '+' : ''}${tooltip.stock.change.toFixed(2)})
            </div>
            <div>Market Cap: ${(tooltip.stock.marketCap / 1000).toFixed(2)}B</div>
            <div>Volume: {(tooltip.stock.volume / 1000000).toFixed(2)}M</div>
            <div className="pt-1 border-t border-gray-700">
              <div>Open: ${tooltip.stock.open.toFixed(2)}</div>
              <div>High: ${tooltip.stock.high.toFixed(2)}</div>
              <div>Low: ${tooltip.stock.low.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
