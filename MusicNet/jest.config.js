// jest.config.js
module.exports = {
    collectCoverage: true,
    coverageDirectory: "coverage",
    coveragePathIgnorePatterns: [
      "/node_modules/",
      "graphics\\.js$",
      "audiosynth\\.js$",
      "webrtcmanager\\.js$",
      "pitchmodule\\.js$"
    ],
    /*coverageThreshold: {
      global: {
        statements: 75,
        branches:   55,
        functions: 50,
        lines:     74
      }
    }*/
  };
  