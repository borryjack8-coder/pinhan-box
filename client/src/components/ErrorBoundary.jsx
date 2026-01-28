import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '40px', textAlign: 'center', background: '#000', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h2 style={{ color: '#ff4444' }}>Kechirasiz, muammo yuz berdi.</h2>
                    <p style={{ color: '#aaa', margin: '20px 0' }}>Sahifani qayta yuklab ko'ring yoki birozdan so'ng harakat qiling.</p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ background: '#FFD700', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        QAYTA YUKLASH
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
