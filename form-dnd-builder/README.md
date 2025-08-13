# Form Drag-and-Drop Builder

## Overview
This project is a drag-and-drop form builder that allows users to create and customize forms easily. Users can move fields and groups of fields within the form, including transferring them between different tabs. The application supports design mode, where users can edit titles and properties of the fields.

## Features
- Drag-and-drop functionality for fields and groups of fields.
- Editable titles and properties for all form elements.
- Support for moving fields between different tabs.
- JSON synchronization to save modifications made in design mode.
- User-friendly interface with distinct styles for design mode.

## Project Structure
```
form-dnd-builder
├── public
│   ├── index.html          # Main HTML document
│   ├── css
│   │   ├── styles.css      # General styles
│   │   └── design.css      # Styles for design mode
│   └── js
│       ├── config.js       # Configuration settings
│       ├── main.js         # Application initialization and functionality
│       ├── design-mode.js   # Logic for enabling/disabling design mode
│       ├── json-sync.js     # Synchronization with JSON file
│       ├── dragdrop-formulariodinamico.js # Drag-and-drop functionality
│       └── libs
│           └── sortable.min.js # Third-party drag-and-drop library
├── api
│   └── guardar_layout.php   # Server-side script for saving layout
├── data
│   └── forms
│       └── form.json       # Initial JSON structure for the form
└── README.md                # Project documentation
```

## Setup Instructions
1. Clone the repository to your local machine.
2. Navigate to the `form-dnd-builder` directory.
3. Open `public/index.html` in a web browser to view the application.

## Usage Guidelines
- Enter design mode to start moving fields around.
- Click on fields to edit their properties.
- Use the drag-and-drop interface to rearrange fields and groups.
- Save your layout to persist changes.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for details.