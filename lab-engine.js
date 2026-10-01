(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.LabEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const domains = {
    sensing: {
      id: 'sensing',
      label: 'Sensing',
      status: 'Nine-channel pressure sensing for rehabilitation research.',
      image: 'assets/photos/cleanroom.jpg',
      accent: '#d6aa62',
      projectId: 'semiconductor',
      projectLink: '#work',
      metadata: ['Pressure sensing', 'Semiconductor metrology', 'Reliability testing'],
    },
    intelligence: {
      id: 'intelligence',
      label: 'Intelligence',
      status: 'Building perception and learning tools for robotic systems.',
      image: 'assets/photos/robot-city.jpg',
      accent: '#78a9ff',
      projectId: 'bipedal',
      projectLink: '#work',
      metadata: ['Isaac Gym', 'Computer vision', 'System identification'],
    },
    control: {
      id: 'control',
      label: 'Control',
      status: 'Developing kinematics, simulations, and embedded control.',
      image: 'assets/photos/robot-city.jpg',
      accent: '#6fc6b4',
      projectId: 'bipedal',
      projectLink: '#work',
      metadata: ['Kinematics', 'LQR and MPC simulations', 'Embedded systems'],
    },
    fabrication: {
      id: 'fabrication',
      label: 'Fabrication',
      status: 'Physical prototypes and hardware builds in progress.',
      image: 'assets/photos/robot-prototype.jpg',
      accent: '#e18d70',
      projectId: 'prototype',
      projectLink: '#work',
      metadata: ['Rapid prototyping', 'PCB design', 'Mechanical integration'],
    },
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function normalizePointer(x, y, width, height) {
    return {
      x: width > 0 ? clamp(x / width, 0, 1) : 0,
      y: height > 0 ? clamp(y / height, 0, 1) : 0,
    };
  }

  function seededNodes(count, seed) {
    const total = Math.max(0, Math.floor(Number(count) || 0));
    let state = (Number(seed) >>> 0) || 1;
    const random = function () {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    return Array.from({ length: total }, function () {
      return { x: random(), y: random(), depth: random() };
    });
  }

  function resolveDomain(id) {
    return domains[id] || domains.sensing;
  }

  return { clamp, normalizePointer, seededNodes, resolveDomain, domains };
});
