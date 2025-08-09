// Configuration settings for the form builder application
const config = {
    apiEndpoint: '/api/guardar_layout.php',
    defaultField: {
        type: 'text',
        label: 'New Field',
        placeholder: 'Enter text',
        required: false,
        options: '',
        style: '',
        regex: '',
        regexMsg: ''
    },
    defaultFieldset: {
        title: 'New Fieldset',
        rows: 1,
        cols: 2
    },
    defaultGrid: {
        rows: 2,
        cols: 2
    },
    designMode: false
};