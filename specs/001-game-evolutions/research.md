# Research: Testing Strategy

## Unknown: Testing Framework

**Task**: Research testing best practices for a Vue.js and Phaser 3 project.

### Decision

After reviewing the project's tech stack (Vite, Vue 3, Phaser 3) and considering best practices, the following testing strategy is recommended:

1.  **Unit & Component Testing**: **Vitest** will be used as the primary framework.
    *   It integrates seamlessly with the existing Vite build process, offering high performance.
    *   Vue components will be tested using `@vue/test-utils`.
    *   Core game logic (e.g., match detection, state transitions) will be written in pure, decoupled JavaScript/TypeScript modules to be tested directly by Vitest without requiring a browser environment.

2.  **End-to-End (E2E) Testing**: **Playwright** will be used for E2E testing.
    *   Its broad cross-browser support (Chromium, Firefox, WebKit/Safari) is critical for ensuring the game works consistently across all platforms, including iOS devices.
    *   It provides robust tooling for test generation, debugging, and parallel execution, which is beneficial for a growing project.

3.  **Integration Testing (for Phaser-coupled logic)**: For logic that cannot be fully decoupled from Phaser Scenes or GameObjects, Vitest will be used with a simulated browser environment.
    *   **Environment**: `happy-dom` will provide the necessary DOM simulation, and `jest-canvas-mock` (or a similar library) will mock the HTML Canvas API.
    *   **Method**: Tests will utilize mocks for Phaser objects and may use Phaser's `HEADLESS` mode to test scene-level logic without rendering.

### Rationale

This multi-tiered approach addresses the different testing needs of a hybrid Vue/Phaser application:

*   **Vitest** is the natural choice for a Vite-based project, minimizing configuration overhead and maximizing performance.
*   **Decoupling game logic** is the most critical principle for making the Phaser part of the codebase testable. It allows for fast, reliable unit tests on the core mechanics without the complexity of a full game engine instance.
*   **Playwright** provides the most comprehensive cross-browser coverage for E2E testing, mitigating the risk of platform-specific bugs, which is a major concern for a web-based game intended for desktop and mobile.

### Alternatives Considered

*   **Jest**: A viable alternative to Vitest for unit testing. However, Vitest offers better integration and performance within a Vite project.
*   **Cypress**: A strong candidate for E2E testing with an excellent developer experience. It was not chosen due to its lack of support for the WebKit (Safari) browser, which is a significant gap for a cross-platform game.