# JSON Tree Editor

## Overview
The JSON Tree Editor is a web application that allows users to visualize, edit, and manage JSON data in a user-friendly interface. It provides a tree structure representation of JSON objects, enabling easy navigation and manipulation of data.

## Project Structure
```
json-tree-editor
├── public
│   └── index.html          # Main HTML document
├── src
│   ├── css
│   │   └── styles.css      # Styles for the application
│   ├── js
│   │   ├── json-tree-panel.js # Implements JSON tree panel functionality
│   │   └── main.js         # Main JavaScript entry point
│   └── json
│       └── formulariogenerico2.json # Initial JSON data
├── server
│   └── guardar_layout.php   # PHP script for saving JSON data
├── package.json             # npm configuration file
└── README.md                # Project documentation
```

## Installation
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd json-tree-editor
   ```
3. Install dependencies:
   ```
   npm install
   ```

## Usage
1. Open `public/index.html` in a web browser to access the application.
2. The JSON tree panel will load the initial data from `src/json/formulariogenerico2.json`.
3. Users can interact with the tree to edit, add, or remove nodes.
4. Changes can be saved using the provided functionality, which communicates with the server-side script `server/guardar_layout.php`.

## Features
- Visual representation of JSON data in a tree structure.
- Edit, add, and delete nodes within the JSON tree.
- Search functionality to filter nodes.
- Responsive design for usability across devices.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License. See the LICENSE file for more details.