# ChemPristine

ChemPristine is a modern, high-performance web application designed for the visualization and analysis of chemical equipment data. Built with a focus on ease of use and visual clarity, it allows users to upload, manage, and visualize critical metrics such as flow rates, pressure, and temperature.

**Data is beautiful when it's pristine.**

---

## 🚀 Live Demo

**[https://chempristine-app-v1.web.app](https://chempristine-app-v1.web.app)**

---

## ✨ Features

-   **Secure Authentication**: Robust user management powered by Supabase Auth (Sign up, Login, Protected Routes).
-   **Data Management**: Seamlessly upload and manage equipment datasets.
-   **Interactive Visualizations**: Dynamic charts and graphs to visualize key metrics:
    -   Flowrate Analysis
    -   Pressure Distribution
    -   Temperature Trends
-   **Equipment Insights**: Detailed breakdowns by equipment type and performance statistics.
-   **Modern UI/UX**: A clean, responsive interface built with Shadcn UI and Tailwind CSS.
-   **Historical Data**: Access and review past uploads and analysis sessions.

## 🛠️ Tech Stack

This project is built using a modern frontend stack to ensure performance, scalability, and developer experience.

*   **Frontend Framework**: [React](https://react.dev/) + [Vite](https://vitejs.dev/) for lightning-fast development and building.
*   **Language**: [TypeScript](https://www.typescriptlang.org/) for type-safe code and better maintainability.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first, responsive design.
*   **UI Components**: [Shadcn UI](https://ui.shadcn.com/) for beautiful, accessible, and customizable components.
*   **Backend & Auth**: [Supabase](https://supabase.com/) for open-source Firebase alternative (Database & Authentication).
*   **Hosting**: [Firebase Hosting](https://firebase.google.com/docs/hosting) for fast and secure global content delivery.
*   **Visualization**: [Recharts](https://recharts.org/) / [Chart.js](https://www.chartjs.org/) for rendering complex data visualizations.

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

*   Node.js (v18 or higher)
*   npm or bun

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/tanusingh04/chempristine-project.git
    cd chempristine-project
    ```

2.  **Install dependencies**
    ```bash
    npm install
    # or
    bun install
    ```

3.  **Start the development server**
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:8080](http://localhost:8080) to view it in the browser.

## 📦 Build & Deploy

To build the application for production:

```bash
npm run build
```

To deploy to Firebase (requires Firebase CLI):

```bash
npm run build
firebase deploy --only hosting
```

---

*Developed with ❤️ for Chemistry & Code.*
