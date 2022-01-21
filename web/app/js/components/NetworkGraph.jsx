import 'whatwg-fetch';
import 'regenerator-runtime/runtime';
import 'core-js/stable';
import { forceCenter, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import { select, selectAll } from 'd3-selection';
import { transition } from 'd3-transition';
import PropTypes from 'prop-types';
import React from 'react';
import _get from 'lodash/get';
import _isEmpty from 'lodash/isEmpty';
import _map from 'lodash/map';
import _uniq from 'lodash/uniq';
import { drag } from 'd3-drag';
import { format } from 'd3-format';
import { metricsPropType } from './util/MetricUtils.jsx';
import { withContext } from './util/AppContext.jsx';
import withREST from './util/withREST.jsx';

import paymentsServiceLabel from '../../img/payments-service-label.png';
import accountServiceLabel from '../../img/account-service-label.png';
import fraudDetectionServiceLabel from '../../img/fraud-detection-service-label.png';
import subscriptionServiceLabel from '../../img/subscription-service-label.png';
import checkoutServiceLabel from '../../img/checkout-service.png';

import snykOSLogo from '../../img/open-source-logo.svg';
import snykCodeLogo from '../../img/snyk-code-logo.svg';
import snykContainerLogo from '../../img/snyk-container-logo.svg';
import snykIacLogo from '../../img/snyk-iac-logo.svg';

const snykOSLogoPath = `http://localhost:7777/${snykOSLogo}`;
const snykCodeLogoPath = `http://localhost:7777/${snykCodeLogo}`;
const snykContainerLogoPath = `http://localhost:7777/${snykContainerLogo}`;
const snykIacLogoPath = `http://localhost:7777/${snykIacLogo}`;

// create a Object with only the subset of functions/submodules/plugins that we need
const d3 = {
  drag,
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  select,
  selectAll,
  format,
  transition,
};

const defaultSvgWidth = 524;
const defaultSvgHeight = 425;
const defaultNodeRadius = 15;
const margin = { top: 0, right: 0, bottom: 5, left: 0 };

const simulation = d3.forceSimulation()
  .force(
    'link',
    d3.forceLink()
      .id(d => d.id)
      .distance(140),
  )
  .force('charge', d3.forceManyBody().strength(-20))
  .force('center', d3.forceCenter(defaultSvgWidth / 2, defaultSvgHeight / 2));

export class NetworkGraphBase extends React.Component {
  componentDidMount() {
    const container = document.getElementsByClassName('network-graph-container')[0];
    const width = !container ? defaultSvgWidth : container.getBoundingClientRect().width;

    this.svg = d3.select('.network-graph-container')
      .append('svg')
      .attr('class', 'network-graph')
      .attr('width', width)
      .attr('height', width)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
  }

  componentDidUpdate() {
    simulation.alpha(1).restart();
    this.drawGraph();
  }

  getGraphData() {
    const { data, deployments } = this.props;
    const links = [];
    const nodeList = [];

    _map(data, (resp, i) => {
      const rows = _get(resp, ['ok', 'statTables', 0, 'podGroup', 'rows']);
      const dst = deployments[i].name;
      _map(rows, row => {
        links.push({
          source: row.resource.name,
          target: dst,
        });
        nodeList.push(row.resource.name);
        nodeList.push(dst);
      });
    });

    const nodes = _map(_uniq(nodeList), n => ({ id: n }));
    return {
      links,
      nodes,
    };
  }

  drawGraph() {
    const graphData = this.getGraphData();

    // check if graph is present to prevent drawing of multiple graphs
    if (this.svg.select('circle')._groups[0][0]) {
      return;
    }
    this.drawGraphComponents(graphData.links, graphData.nodes);
  }

  drawGraphComponents(links, nodes) {
    if (_isEmpty(nodes)) {
      d3.select('.network-graph-container').select('svg').attr('height', 0);
      return;
    } else {
      d3.select('.network-graph-container').select('svg').attr('height', defaultSvgHeight);
    }

    this.svg.append('svg:defs').selectAll('marker')
      .data(links) // Different link/path types can be defined here
      .enter()
      .append('svg:marker') // This section adds in the arrows
      .attr('id', node => `${node.source}/${node.target}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 24)
      .attr('refY', -0.25)
      .attr('markerWidth', 3)
      .attr('markerHeight', 3)
      .attr('fill', '#454242')
      .attr('orient', 'auto')
      .append('svg:path')
      .attr('d', 'M0,-5L10,0L0,5');

    // add the links and the arrows
    const path = this.svg.append('svg:g').selectAll('path')
      .data(links)
      .enter()
      .append('svg:path')
      .attr('stroke-width', 3)
      .attr('stroke', '#454242')
      .attr('marker-end', node => `url(#${node.source}/${node.target})`);

    // div for the tooltip
    const div = d3.select('body').append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    // const snykOSLogoPath = `http://localhost:7777/${snykOSLogo}`
    // const snykCodeLogoPath = `http://localhost:7777/${snykCodeLogo}`
    // const snykContainerLogoPath = `http://localhost:7777/${snykContainerLogo}`
    // const snykIacLogoPath = `http://localhost:7777/${snykIacLogo}`

    const securityPostureInfo = {
      'payment-service': {
        critical: 2,
        'critical-sources': [snykOSLogoPath],
        high: 10,
        'high-sources': [snykOSLogoPath, snykCodeLogoPath],
        medium: 5,
        'medium-sources': [snykOSLogoPath, snykCodeLogoPath, snykContainerLogoPath],
        low: 42,
        'low-sources': [snykOSLogoPath, snykCodeLogoPath, snykContainerLogoPath, snykIacLogoPath],
      },
      'account-service': {
        critical: 0,
        'critical-sources': [],
        high: 1,
        'high-sources': [snykOSLogoPath],
        medium: 12,
        'medium-sources': [snykOSLogoPath, snykCodeLogoPath],
        low: 5,
        'low-sources': [snykOSLogoPath, snykCodeLogoPath, snykContainerLogoPath, snykIacLogoPath],
      },
      'fraud-detection-service': {
        critical: 0,
        'critical-sources': [],
        high: 0,
        'high-sources': [],
        medium: 7,
        'medium-sources': [snykOSLogoPath, snykCodeLogoPath, snykContainerLogoPath],
        low: 47,
        'low-sources': [snykOSLogoPath],
      },
      'checkout-service': {
        critical: 0,
        'critical-sources': [],
        high: 0,
        'high-sources': [],
        medium: 7,
        'medium-sources': [snykOSLogoPath],
        low: 9,
        'low-sources': [snykOSLogoPath, snykCodeLogoPath],
      },
      'subscription-service': {
        critical: 0,
        'critical-sources': [],
        high: 2,
        'high-sources': [snykOSLogoPath],
        medium: 1,
        'medium-sources': [snykOSLogoPath],
        low: 5,
        'low-sources': [snykOSLogoPath, snykContainerLogoPath],
      },
    };

    const computeIssues = array => {
      let result = '';

      array.forEach(element => {
        result += ` <img src=${element} alt="snyk product logo" width="20" /> `;
      });

      return result;
    };

    const nodeElements = this.svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', defaultNodeRadius)
      .attr('fill', 'steelblue')
      .call(d3.drag()
        .on('start', NetworkGraphBase.dragstarted)
        .on('drag', NetworkGraphBase.dragged)
        .on('end', NetworkGraphBase.dragended))
      .on('click', event => {
        div.transition()
          .duration(200)
          .style('opacity', 0.9);
        div.html(`
        <style>
          .modalDialog {
              position: fixed;
              font-family: Arial, Helvetica, sans-serif;
              top: 0;
              right: 0;
              bottom: 0;
              left: 0;
              background: rgba(0, 0, 0, 0.8);
              z-index: 99999;
              opacity: 1;
              -webkit-transition: opacity 400ms ease-in;
              -moz-transition: opacity 400ms ease-in;
              transition: opacity 400ms ease-in;
              pointer-events: auto;
          }
          .modalDialog > div {
              width: 400px;
              position: relative;
              margin: 10% auto;
              padding: 5px 20px 13px 20px;
              border-radius: 10px;
              background: #fff;
              background: -moz-linear-gradient(#fff, #999);
              background: -webkit-linear-gradient(#fff, #999);
              background: -o-linear-gradient(#fff, #999);
          }
          .close {
              background: #606061;
              color: #FFFFFF;
              line-height: 25px;
              position: absolute;
              right: -12px;
              text-align: center;
              top: -10px;
              width: 24px;
              text-decoration: none;
              font-weight: bold;
              -webkit-border-radius: 12px;
              -moz-border-radius: 12px;
              border-radius: 12px;
              -moz-box-shadow: 1px 1px 3px #000;
              -webkit-box-shadow: 1px 1px 3px #000;
              box-shadow: 1px 1px 3px #000;
          }
          .close:hover {
              background: #00d9ff;
          }
        </style>
        <div id="openModal" class="modalDialog">
            <div>\t<a href="#close" title="Close" class="close" onClick="window.location.reload();">X</a>

                \t<h2>Security posture for ${event.currentTarget.__data__.id}</h2>

                <p>Critical issues: ${securityPostureInfo[event.currentTarget.__data__.id].critical}</p>
                <p>
                    Sources:
                    ${computeIssues(securityPostureInfo[event.currentTarget.__data__.id]['critical-sources'])}
                </p>
                <p>High issues: ${securityPostureInfo[event.currentTarget.__data__.id].high}</p>
                  <p>
                    Sources:
                    ${computeIssues(securityPostureInfo[event.currentTarget.__data__.id]['high-sources'])}
                </p>
                <p>Medium issues: ${securityPostureInfo[event.currentTarget.__data__.id].medium}</p>
                  <p>
                    Sources:
                    ${computeIssues(securityPostureInfo[event.currentTarget.__data__.id]['medium-sources'])}
                </p>
                <p>Low issues: ${securityPostureInfo[event.currentTarget.__data__.id].low}</p>
                  <p>
                    Sources:
                    ${computeIssues(securityPostureInfo[event.currentTarget.__data__.id]['low-sources'])}
                </p>
            </div>
        </div>
        `)
          .style('left', `${event.x}px`)
          .style('top', `${event.y - 28}px`)
          .style('position', 'absolute');
      });

    const textElements = this.svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter()
      .append('text')
      .text(node => node.id)
      .attr('font-size', 15)
      .attr('dx', 20)
      .attr('dy', 4);

    const labels = {
      'payment-service': `http://localhost:7777/${paymentsServiceLabel}`,
      'account-service': `http://localhost:7777/${accountServiceLabel}`,
      'fraud-detection-service': `http://localhost:7777/${fraudDetectionServiceLabel}`,
      'checkout-service': `http://localhost:7777/${checkoutServiceLabel}`,
      'subscription-service': `http://localhost:7777/${subscriptionServiceLabel}`,
    };

    const getRandomFrom = nodeId => {
      return labels[nodeId];
    };

    const labelElements = this.svg.append('g')
      .selectAll('image')
      .data(nodes)
      .enter()
      .append('svg:image')
      .attr('xlink:href', node => getRandomFrom(node.id))
      .attr('height', '18');

    simulation.nodes(nodes).on('tick', () => {
      path
        .attr('d', node => `M${node.source.x} ${node.source.y} L ${node.target.x} ${node.target.y}`);

      nodeElements
        .attr('cx', node => node.x)
        .attr('cy', node => node.y);

      textElements
        .attr('x', node => node.x)
        .attr('y', node => node.y);

      labelElements
        .attr('x', node => node.x + 16)
        .attr('y', node => node.y + 12);
    });

    simulation.force('link')
      .links(links);
  }

  static dragstarted(event, d) {
    if (!event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    d.x = event.x;
    d.y = event.y;
  }

  static dragged(event, d) {
    d.x = event.x;
    d.y = event.y;
  }

  static dragended(event, d) {
    if (!event.active) {
      simulation.alphaTarget(0);
    }
    d.x = event.x;
    d.y = event.y;
  }

  render() {
    return (
      <div>
        <div className="network-graph-container" />
      </div>
    );
  }
}

NetworkGraphBase.defaultProps = {
  deployments: [],
};

NetworkGraphBase.propTypes = {
  data: PropTypes.arrayOf(metricsPropType.isRequired).isRequired,
  deployments: PropTypes.arrayOf(PropTypes.object),
};

export default withREST(
  withContext(NetworkGraphBase),
  ({ api, namespace, deployments }) => {
    return _map(deployments, d => {
      return api.fetchMetrics(`${api.urlsForResource('deployment', namespace)}&to_name=${d.name}`);
    });
  },
  {
    poll: false,
    resetProps: ['deployment'],
  },
);
