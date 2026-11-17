/* Content for case files, terminal and the skills constellation. */
window.SITE = {
  email: "owenchen0408@gmail.com",
  github: "https://github.com/oweche",
  linkedin: "https://www.linkedin.com/in/owen-chen-aab061216/",

  projects: {
    biped: {
      n: "01", title: "Transforming wheeled bipedal robot",
      org: "Taipei Tech × MIT City Science Lab", role: "UROP researcher", when: "Jul 2024 – Jan 2025",
      lede: "I helped design and build a small robot prototype and a full-scale wheeled bipedal platform — combining mechanical assembly, control development, and electrical distribution.",
      images: [
        ["assets/img/robot-fullscale.jpg", "Full-scale platform under test with the control laptop"],
        ["assets/img/robot-prototype.jpg", "Small wheeled-bipedal prototype"],
        ["assets/img/robot-proto-hands.jpg", "Hands-on testing of the small prototype"],
        ["assets/img/robot-frame.jpg", "Full-scale platform in its support frame"],
        ["assets/img/robot-proto-test.jpg", "Mechanical assembly work"]
      ],
      sections: [
        ["System & my contribution", "<p>The platform explored a <b>docking concept</b>: two wheeled bipedal robots join into a more stable quadruped configuration to climb obstacles together, then split for last-mile travel.</p><ul><li>Worked on the <b>robot structure and docking mechanism</b>.</li><li>Implemented <b>inverse kinematics</b> for height and pose control.</li><li>Simulated <b>LQR and MPC</b> balance and disturbance-rejection strategies in <b>MuJoCo</b>.</li><li>Designed a <b>two-layer power &amp; CAN-bus distribution PCB</b> in KiCad — copper traces sized for expected loads, point-to-point connections consolidated.</li></ul>"],
        ["Built and tested", "<p>The completed work included the small prototype, the larger robot assembly, and height and pose-control development. Balance testing on the small platform and controller simulation informed the hardware work; autonomous docking and terrain traversal remained broader system objectives.</p><p>Project team: Morris Chen, Anson Liu, Jason Guo and Owen Chen.</p>"]
      ],
      pivot: "<b>A prototype result that changed the design.</b> The small robot’s bar linkage didn’t deliver enough leg torque, so we switched to a <b>belt drive</b> — a result that shaped the full-scale robot’s mechanical design. The prototype also demonstrated joystick-controlled balance and let us explore how wheel position affects balance.",
      stats: [["≈25%", "fewer individual wires after the distribution PCB"], ["2-layer", "power + CAN board in KiCad"], ["LQR · MPC", "balance controllers simulated in MuJoCo"]],
      links: [["City Science Lab project page ↗", "https://www.csltaipeitech.com/en/project/blog-post-title-three-j5323"]],
      demos: ["balance", "ik", "pcb"],
      skills: ["KiCad", "CAN", "MuJoCo", "LQR / MPC", "Inverse kinematics", "Mechanical assembly", "Python"]
    },
    fab: {
      n: "02", title: "Semiconductor fabrication & metrology",
      org: "Birck Nanotechnology Center · Purdue Semiconductor VIP", role: "Junior fabrication technician", when: "2026 – present",
      lede: "I work across device preparation, fabrication tools, and measurement analysis — with an emphasis on repeatable procedures and traceable results.",
      images: [
        ["assets/img/cleanroom-metrology.jpg", "Metrology station under yellow litho lighting"],
        ["assets/img/cleanroom-team.jpg", "Gowned up with the fab team"],
        ["assets/img/cleanroom-litho.jpg", "Working in the yellow-light litho bay"],
        ["assets/img/vk-etch-2.jpg", "Keyence VK-X3000 step-height measurement of an etched feature"],
        ["assets/img/vk-etch-3.jpg", "Etched feature edge profile"],
        ["assets/img/filmetrics-map-1.jpg", "Filmetrics F40 thickness map"],
        ["assets/img/filmetrics-sio2.jpg", "SiO₂ deposition thickness map"],
        ["assets/img/tsv-poster.jpg", "Team poster — TSVs using deep silicon etching and a photoresist soft mask"]
      ],
      sections: [
        ["Fabrication & process work", "<p>As a junior fabrication technician I support <b>copper through-silicon-via (TSV)</b> process development through wafer preparation, photolithography, deposition, and metrology:</p><ul><li>Solvent cleaning and <b>spin coating</b> on a Laurell WS-650-23B</li><li>Exposure on a <b>SÜSS MA6/BA6</b> mask aligner</li><li><b>DC/RF sputtering</b></li><li>Thin-film measurement with a <b>Filmetrics F40-UV</b> reflectometer</li><li>Characterizing etched structures with <b>Keyence VK-X3000</b> confocal microscopy and a <b>Park NX20 AFM</b></li></ul><p>I document fabrication parameters and measurements to help establish a <b>repeatable TSV process</b>, including statistical process-control work around a Plasma-Therm ICP-RIE etcher.</p>"]
      ],
      stats: [["Cu TSV", "process under development"], ["6+", "fab & metrology tools run hands-on"], ["SPC", "process documentation for repeatability"]],
      links: [],
      demos: ["tsv", "film", "profilo"],
      skills: ["Photolithography", "Sputtering", "Filmetrics F40", "VK-X3000", "AFM", "Process documentation"]
    },
    esp32: {
      n: "03", title: "ESP32 measurement workflow & non-destructive screening",
      org: "Birck Nanotechnology Center · SURF 2026", role: "Undergraduate researcher (with Prof. Peter Bermel)", when: "2026",
      lede: "Measurement procedures and custom fixtures for UV-Vis-NIR diffuse-reflectance characterization, plus laser profilometry to compare surface features across suppliers.",
      images: [
        ["assets/img/esp32-devkit.jpg", "ESP32-DevKitC specimen"],
        ["assets/img/surf-poster.jpg", "SURF poster — Non-Destructive Screening of RP2040 and ESP32 Devices"],
        ["assets/img/dra-fixture.jpg", "Fixture CAD for RF-shield and USB-UART chip sites"],
        ["assets/img/vk-instrument.jpg", "Surface measurement instrument setup"],
        ["assets/img/our-symposium.jpg", "Purdue Office of Undergraduate Research event"]
      ],
      sections: [
        ["What I measure", "<p>The retained profilometry analysis spans <b>five suppliers, 60 specimens and 180 processed surfaces</b> across the included measurement sites. The poster also covers gas-chromatography screening of RP2040 chips (solid-phase microextraction sampling) and diffuse-reflectance spectra.</p>"],
        ["The part that actually matters", "<p>A practical part of the work is checking whether scans capture <b>comparable physical features</b> before interpreting the statistics. The current workflow keeps sites separate and defers the dot-corner site where capture consistency needs attention. Supplier-level differences are evidence for further investigation — <b>not a standalone authentication rule</b>.</p>"]
      ],
      stats: [["5", "suppliers"], ["60", "specimens"], ["180", "processed surfaces"]],
      links: [],
      demos: ["profilo"],
      skills: ["Laser profilometry", "UV-Vis-NIR", "Fixture design", "Python", "Statistics", "VK-X3000"]
    },
    foot: {
      n: "04", title: "Pressure-sensing foot interface",
      org: "Serelix Robotics", role: "Engineering intern", when: "Jun – Sep 2025",
      lede: "A parametric TPU foot interface for a post-stroke rehabilitation exoskeleton, and a custom nine-channel pressure-sensing PCB.",
      images: [
        ["assets/img/foot-cad.jpg", "Foot-interface CAD iteration (Rhino + Grasshopper)"],
        ["assets/img/foot-pcb-render.jpg", "KiCad render of my Foot Sensor V1 PCB"],
        ["assets/img/foot-tpu-print.jpg", "TPU lattice print"]
      ],
      sections: [
        ["Mechanical design", "<p>The interface had to fit different foot sizes while providing support and flexibility in different regions. I used <b>Rhino and Grasshopper</b> to develop the parametric geometry and <b>region-specific lattice structures</b> for FDM printing in TPU, keeping size-specific revisions for <b>US 8, 9, 10 and 12</b>.</p>"],
        ["Electrical design & fabrication handoff", "<p>I designed the sensor interface around an <b>ADS124S08 ADC</b>, captured the schematic and routed the PCB in <b>KiCad</b>, then prepared manufacturing exports: copper and mask Gerbers, board outline, BOM, component positions and a netlist.</p><p>The deliverables brought mechanical fit, compliant geometry and sensing electronics into the same development effort.</p>"]
      ],
      stats: [["9", "pressure channels"], ["4", "size-specific revisions"], ["Full", "fab package: Gerbers, BOM, CPL, netlist"]],
      links: [],
      demos: ["foot"],
      skills: ["Rhino + Grasshopper", "KiCad", "ADS124S08", "TPU FDM", "Multi-material FDM"]
    },
    eq: {
      n: "05", title: "ECE 2k7 three-band audio equalizer",
      org: "Purdue University · analog electronics", role: "Course project", when: "Spring 2026",
      lede: "A three-band analog audio equalizer on a solderless breadboard, demonstrated with audio input, speakers and oscilloscope monitoring.",
      images: [
        ["assets/img/eq-board-top.jpg", "Assembled breadboard circuit"],
        ["assets/img/eq-breadboard.jpg", "Filter and level-control stages"],
        ["assets/img/eq-bench.jpg", "Adjusting the controls during the bench demo"],
        ["assets/img/eq-speakers.jpg", "Connected speaker setup"]
      ],
      video: "assets/media/eq-demo.mp4",
      sections: [
        ["Circuit & signal path", "<p>Low-, mid- and high-frequency <b>filter paths with adjustable levels</b>, recombined before a <b>power-amplifier stage</b> drives the speaker — frequency-selective filtering and op-amp circuits connected into a complete audio chain.</p>"],
        ["Hardware integration & bench demo", "<p>Built with op-amps, resistors, capacitors and trimmer potentiometers, with external power and instrument connections accessible at the breadboard. In the recorded demo the controls are adjusted while the waveform is displayed on the oscilloscope — the circuit operating as an integrated bench prototype.</p>"]
      ],
      stats: [["3", "independent bands"], ["Op-amp", "active filters + power stage"], ["Scope", "verified on the bench"]],
      links: [],
      demos: ["eq"],
      skills: ["Analog circuits", "Op-amps", "Oscilloscopes", "Soldering / prototyping"]
    },
    ftc: {
      n: "06", title: "FTC drone scoring & CNC components",
      org: "FIRST Tech Challenge Team 16021 · Techno Maniacs", role: "Drone & specialized scoring lead", when: "2022 – 2025",
      lede: "I developed a drone-scoring mechanism with Java-based actuator controls, and machined drivetrain and scoring parts on a CNC router.",
      images: [
        ["assets/img/ftc-robot-16021.jpg", "Competition robot, team 16021"],
        ["assets/img/ftc-robot-led.jpg", "Competition robot on the field"],
        ["assets/img/ftc-team.jpg", "Techno Maniacs team"]
      ],
      sections: [
        ["What I built", "<ul><li>Developed the <b>drone-scoring mechanism</b> and integrated <b>Java-based actuator controls</b>.</li><li>Programmed and operated a <b>WorkBee CNC router</b> using <b>Fusion 360 CAM</b> to machine aluminum and polymer drivetrain and scoring components.</li><li>The added subsystem increased maximum scoring capacity by <b>≈20%</b>. Mounting, actuation and repeatable operation all had to work together on a competition robot.</li></ul>"],
        ["Team context", "<p>Techno Maniacs is a high-school FTC team in Acton, MA. Per the team site, the 2024 season included three tournament wins (including the New England and Husky Robotics invitationals), a #1 New England ranking by offensive power before Worlds, and multiple Innovate Awards.</p>"]
      ],
      stats: [["≈20%", "higher max scoring capacity"], ["Al + polymer", "CNC-machined parts"], ["3 seasons", "on the team"]],
      links: [["technomaniacs.org ↗", "https://technomaniacs.org/"]],
      demos: [],
      skills: ["Java", "Fusion 360 CAM", "CNC machining", "Mechanism design"]
    },
    mosfet: {
      n: "07", title: "Power MOSFET high-temperature gate-bias aging",
      org: "Purdue research", role: "Undergraduate researcher", when: "2026",
      lede: "An AEC-Q101-aligned high-temperature gate-bias (HTGB) aging protocol for onsemi power MOSFETs, with electrical, optical and surface characterization.",
      images: [
        ["assets/img/mosfet-package.jpg", "Power MOSFET package with inspection sites"],
        ["assets/img/vk-roughness-aging.jpg", "Surface roughness parameters across aging rounds"]
      ],
      sections: [
        ["What I did", "<ul><li>Developed and executed an <b>AEC-Q101-aligned HTGB aging protocol</b>.</li><li>Electrical measurements with <b>Keithley source-measure units</b>.</li><li>Tracked package-surface changes with <b>FTIR</b> and <b>laser profilometry</b> across aging rounds — looking for nondestructive, package-dependent indicators of aging.</li></ul>"]
      ],
      stats: [["AEC-Q101", "aligned protocol"], ["SMU", "Keithley electrical tracking"], ["FTIR + VK", "nondestructive indicators"]],
      links: [], demos: ["profilo"],
      skills: ["Keithley SMUs", "FTIR", "Laser profilometry", "Reliability testing", "Python"]
    },
    motor: {
      n: "08", title: "Motorsports & autonomy",
      org: "Purdue Formula SAE · Purdue VIP ARES", role: "Electronics team member · VIP team member", when: "2025 – present",
      lede: "Vehicle electronics on the Formula SAE team, and a team poster on a digital twin for an autonomous go-kart.",
      images: [
        ["assets/img/vip-ares-team.jpg", "VIP ARES poster session"],
        ["assets/img/vip-ares-poster.jpg", "Digital twin for an autonomous go-kart — poster"]
      ],
      sections: [
        ["Formula SAE electronics", "<p>Throttle control, <b>ECU validation</b> and <b>Yamaha R6 dynamometer wiring</b> — turning control requirements into documented, testable hardware. Also hands-on with roll-cage fabrication and vehicle wiring.</p>"],
        ["VIP ARES", "<p>Co-presented <b>“VIP ARES — Digital Twin for an Autonomous Go-Kart”</b> with Akram Mohamed and Paul Hamas.</p>"]
      ],
      stats: [["ECU", "validation"], ["R6", "dyno wiring"], ["MIG", "roll-cage fabrication"]],
      links: [], demos: [],
      skills: ["Vehicle wiring", "ECU validation", "MIG welding", "CAN"]
    }
  },

  demoNames: { balance: "Biped balance", ik: "Leg kinematics", pcb: "Power / CAN board", eq: "3-band equalizer", foot: "Foot pressure", tsv: "TSV process", film: "Film thickness", profilo: "Surface scan" },

  // project -> skills for constellation (subset of above, short labels)
  graph: {
    projects: [
      ["biped", "Wheeled biped"], ["fab", "Cleanroom fab"], ["esp32", "ESP32 metrology"], ["foot", "Foot interface"],
      ["eq", "Audio EQ"], ["ftc", "FTC 16021"], ["mosfet", "MOSFET aging"], ["motor", "Motorsports"], ["shop", "Fab shop"]
    ],
    skills: {
      "KiCad": ["biped", "foot"], "CAN": ["biped", "motor"], "MuJoCo": ["biped"], "LQR / MPC": ["biped"], "Inverse kinematics": ["biped"],
      "Python": ["biped", "esp32", "mosfet", "fab"], "Photolithography": ["fab"], "Sputtering": ["fab"], "VK-X3000": ["fab", "esp32", "mosfet"],
      "AFM": ["fab"], "Filmetrics": ["fab"], "UV-Vis-NIR": ["esp32"], "FTIR": ["mosfet"], "Keithley SMU": ["mosfet"],
      "Rhino / GH": ["foot"], "ADS124S08": ["foot"], "Multi-material FDM": ["foot", "shop", "esp32"], "Op-amps": ["eq"], "Oscilloscope": ["eq", "biped"],
      "Java": ["ftc"], "Fusion 360 CAM": ["ftc", "shop"], "CNC": ["ftc"], "MIG welding": ["motor"], "Vehicle wiring": ["motor"],
      "Printer repair": ["shop"], "SolidWorks / NX": ["biped", "foot", "shop"]
    }
  }
};
