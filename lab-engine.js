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
      status: 'Characterization turns a surface, spectrum, or electrical trace into evidence.',
      image: 'assets/photos/cleanroom.jpg',
      alt: 'Owen Chen and a colleague in cleanroom PPE beside semiconductor imaging equipment',
      caption: 'Cleanroom characterization · Purdue',
      medium: 'Surface / spectrum / electrical trace',
      accent: '#d6aa62',
      projectId: 'semiconductor',
      projectLink: '#project-semiconductor-story',
      metadata: ['Semiconductor metrology', 'Spectroscopy', 'Reliability testing'],
    },
    intelligence: {
      id: 'intelligence',
      label: 'Intelligence',
      status: 'Models and analysis expose system behavior before hardware has to absorb the mistake.',
      image: 'assets/photos/robot-city.jpg',
      alt: 'Bipedal city transport robot mounted on a laboratory test rig',
      caption: 'Robot system model · Taipei',
      medium: 'Simulation / optimization / decision',
      accent: '#78a9ff',
      projectId: 'bipedal',
      projectLink: '#project-bipedal-story',
      metadata: ['MuJoCo', 'LQR and MPC', 'System analysis'],
    },
    control: {
      id: 'control',
      label: 'Control',
      status: 'Kinematics, simulation, and embedded loops turn a mechanism into coordinated motion.',
      image: 'assets/photos/robot-city.jpg',
      alt: 'Bipedal city transport robot mounted on a laboratory test rig',
      caption: 'Robot system test · Taipei',
      medium: 'Kinematics / CAN bus / embedded loop',
      accent: '#6fc6b4',
      projectId: 'bipedal',
      projectLink: '#project-bipedal-story',
      metadata: ['Kinematics', 'LQR and MPC simulations', 'Embedded systems'],
    },
    fabrication: {
      id: 'fabrication',
      label: 'Fabrication',
      status: 'Physical prototypes make geometry, packaging, and integration constraints impossible to ignore.',
      image: 'assets/photos/robot-prototype.jpg',
      alt: 'Close-up of Owen Chen’s compact white bipedal robot prototype on a workbench',
      caption: 'Compact bipedal prototype · bench build',
      medium: 'Mechanism / PCB / physical iteration',
      accent: '#e18d70',
      projectId: 'prototype',
      projectLink: '#project-prototype-story',
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
