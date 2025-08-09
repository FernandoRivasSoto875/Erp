# Formulariodinamico App

## Overview
The Formulariodinamico App is a dynamic form generation application that allows users to create, edit, and manage forms based on a JSON structure. The application provides a user-friendly interface for navigating and modifying the form properties, making it suitable for various use cases.

## Project Structure
```
formulariodinamico-app
├── app
│   ├── formulariodinamico.php          # Main script for dynamic form generation
│   ├── formulariodinamicofunciones.php  # Utility functions for form handling
│   ├── formulariodinamicologica.php      # Logic for data validation and processing
│   └── partials
│       ├── right-panel-json-tree.php     # Panel for navigating and editing JSON properties
│       └── outside-elements.php          # Manages elements outside the main form
├── json
│   ├── formulariogenerico2.json         # Main JSON file defining form structure
│   └── samples
│       ├── simple.json                  # Sample JSON for testing
│       └── complex.json                 # Complex sample JSON for advanced testing
├── public
│   ├── index.php                        # Entry point for the web application
│   └── assets
│       ├── css
│       │   ├── styles.css               # Main CSS styles
│       │   └── json-tree.css            # Styles for JSON tree structure
│       └── js
│           ├── formulariodinamico.js    # JavaScript for dynamic form functionality
│           ├── dragdrop-formulariodinamico.js # JavaScript for drag-and-drop functionality
│           ├── json-tree-panel.js       # Manages JSON tree panel
│           ├── json-editor-panel.js     # JavaScript for editing JSON content
│           └── state-history.js         # Manages state history for undo/redo functionality
└── README.md                             # Documentation for the project
```

## Setup Instructions
1. **Clone the Repository**
   Clone the repository to your local machine using:
   ```
   git clone <repository-url>
   ```

2. **Install Dependencies**
   Ensure you have PHP and a web server (like Apache or Nginx) set up to run the application.

3. **Configure the Web Server**
   Point your web server's document root to the `public` directory of the project.

4. **Access the Application**
   Open your web browser and navigate to `http://localhost/index.php` to access the application.

## Usage Guidelines
- Use the main interface to create and manage dynamic forms.
- The right panel provides a tree structure view of the JSON content, allowing for easy navigation and editing of properties.
- Sample JSON files are included in the `json/samples` directory for testing purposes.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.