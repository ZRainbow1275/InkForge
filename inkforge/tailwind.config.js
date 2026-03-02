/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0066cc',
                    50: '#e6f2ff',
                    100: '#b3d9ff',
                    500: '#0066cc',
                    600: '#0052a3',
                    700: '#003d7a',
                },
            },
        },
    },
    plugins: [],
}
