import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppLayout } from "./pages/app-layout";
import { DashboardPage } from "./pages/dashboard-page";
import { NewProjectPage } from "./pages/new-project-page";
import { ProjectResultPage } from "./pages/project-result-page";
import { TemplatesPage } from "./pages/templates-page";
import "./styles.css";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "projects/new", element: <NewProjectPage /> },
      { path: "projects/:projectId/jobs/:jobId", element: <ProjectResultPage /> },
      { path: "templates", element: <TemplatesPage /> }
    ]
  }
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
