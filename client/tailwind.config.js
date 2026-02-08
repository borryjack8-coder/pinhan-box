/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'pinhan-gold': '#FFD700',
                'pinhan-black': '#111111',
                'pinhan-dark': '#0a0a0a',
            }
        },
    },
    plugins: [],
}
