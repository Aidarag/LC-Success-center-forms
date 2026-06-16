# 🎓 Livingstone College Success Center Digital Forms Portal

A modern, responsive client-side web utility designed for the **Success Center** at **Livingstone College** in Salisbury, North Carolina. This portal digitizes the monthly reporting workflow for student mentors and tutors, allowing them to record work hours, track student academic support sessions, generate professional administrative PDFs, and submit them directly to their supervisor.

---

## 🌟 Visual Overview

The application features a clean, responsive layout designed using the official Livingstone College branding colors (Black, White, and Light Blue accents) and typography.

*   **Hourly Timesheet**: Logs daily shifts, calculates total hours, and generates a structured monthly report.
*   **Student Session & Progress Record**: Logs detailed student support tutoring hours with autocomplete suggestions for subjects/skills and records progress comments.

---

## 🚀 Key Features

### 1. Minimalist Client-Side Architecture
*   **Offline-Friendly & Serverless**: Runs completely on the client side without database overhead, user accounts, cloud storage, or external APIs.
*   **Autosave Protection**: Automatically persists current draft states to the browser's `localStorage` to safeguard input data against page reloads or browser crashes.

### 2. Form 1: Success Center Monthly Timesheet
*   **Time-to-Decimal Engine**: Handles input in standard `00:00` format (24-hour) and automatically calculates exact decimal working hours (e.g. `09:00` to `11:30` yields `2.50` hours).
*   **Multi-Shift Tracking**: Supports logging up to two shifts per date (Shift 1 + Shift 2) with automatically aggregated daily and grand total sums.

### 3. Form 2: Student Session & Progress Record
*   **Academic Tutoring Logs**: Records Date, Time In, Time Out, Subject/Skills, and qualitative Progress Comments.
*   **Smart Suggestions**: Incorporates autocomplete tags for common academic support categories (e.g., *Essay Review*, *Test Preparation*, *Time Management*, *Math Tutoring*).
*   **Total Support Summaries**: Automatically sums academic tutoring hours logged per student.

### 4. Consolidated Output Actions
*   🖨️ **Print Form**: Optimised print styles (`@media print` in CSS) convert the digital web layout into a clean, physical paper layout. It hides buttons and navigation tabs and renders professional signature blocks.
*   📥 **Download PDF**: Dynamically compiles the forms using custom university branding headers, tables, and signature blocks into high-fidelity PDFs.
*   ✉️ **Submit PDF**: Compiles the PDF and launches an interactive email submission modal pre-addressed to the Success Center supervisor:
    *   **Supervisor**: Benjamin Davis
    *   **Supervisor Email**: `bdavis1@livingstone.edu`
    *   **Attachment Preview**: Displays the custom PDF filename.
    *   **Simulated Dispatch**: Simulates email transmission with real-time feedback status.

### 5. Configurable File Naming
*   Allows users to preview and custom-edit the PDF filename prior to downloading or submitting.
*   Auto-generates clean, structured file names based on user inputs:
    *   *Timesheet*: `[Employee_Name]_Timesheet_[Month]_[Year].pdf`
    *   *Session Record*: `[Student_Name]_Academic_Report_[Month]_[Year].pdf`

---

## 🛠️ Technology Stack

*   **Framework**: React (v19)
*   **Build Tool**: Vite
*   **Icons**: Lucide React
*   **PDF Generation**: `jspdf` & `html2canvas`
*   **HTML Sanitisation**: `dompurify`
*   **Styling**: Vanilla CSS with custom CSS variable theme tokens (configured in `src/index.css`)

---

## 💻 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Aidarag/LC-Success-center-forms.git
   cd LC-Success-center-forms
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally
To launch the hot-reloading development server:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:5173/`.

### Production Build
To build the application for deployment:
```bash
npm run build
```
This compiles assets and generates output files into the `dist/` directory.

---

## 👤 Department Details
*   **Institution**: Livingstone College
*   **Department**: Success Center
*   **Location**: Salisbury, North Carolina
*   **Supervisor**: Benjamin Davis (`bdavis1@livingstone.edu`)
