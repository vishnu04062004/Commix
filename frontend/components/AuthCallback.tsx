import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthCallback: React.FC = () => {
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Processing authentication...');
    const navigate = useNavigate();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                console.log('AuthCallback: Starting authentication process');
                console.log('AuthCallback: Current URL:', window.location.href);

                // Get tokens from URL parameters
                const params = new URLSearchParams(window.location.search);
                const accessToken = params.get('access_token');
                const refreshToken = params.get('refresh_token');
                const error = params.get('message');

                console.log('AuthCallback: Access token present:', !!accessToken);
                console.log('AuthCallback: Refresh token present:', !!refreshToken);
                console.log('AuthCallback: Error:', error);

                if (error) {
                    console.error('AuthCallback: OAuth error:', error);
                    setStatus('error');
                    setMessage(`Authentication failed: ${error}`);
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                if (!accessToken) {
                    console.error('AuthCallback: No access token in URL');
                    setStatus('error');
                    setMessage('No access token received');
                    setTimeout(() => navigate('/login'), 3000);
                    return;
                }

                console.log('AuthCallback: Storing tokens in localStorage');
                // Store tokens in localStorage
                localStorage.setItem('access_token', accessToken);
                if (refreshToken) {
                    localStorage.setItem('refresh_token', refreshToken);
                }

                console.log('AuthCallback: Fetching user info from /auth/me');
                // Fetch user info
                const response = await fetch('http://localhost:8000/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });

                console.log('AuthCallback: /auth/me response status:', response.status);

                if (!response.ok) {
                    throw new Error(`Failed to fetch user info: ${response.status}`);
                }

                const user = await response.json();
                console.log('AuthCallback: User info received:', user.email);
                localStorage.setItem('user', JSON.stringify(user));

                setStatus('success');
                setMessage('Authentication successful! Redirecting...');

                console.log('AuthCallback: Redirecting to / in 1 second');
                // Redirect to main app
                setTimeout(() => {
                    console.log('AuthCallback: Executing navigation to /');
                    navigate('/', { replace: true });
                }, 1000);

            } catch (error) {
                console.error('AuthCallback: Error during authentication:', error);
                setStatus('error');
                setMessage('Authentication failed. Please try again.');
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                {status === 'loading' && (
                    <>
                        <div style={styles.spinner}></div>
                        <h2 style={styles.title}>{message}</h2>
                        <p style={styles.subtitle}>Please wait...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={styles.successIcon}>✓</div>
                        <h2 style={styles.title}>{message}</h2>
                        <p style={styles.subtitle}>Taking you to your dashboard</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div style={styles.errorIcon}>✕</div>
                        <h2 style={styles.title}>{message}</h2>
                        <p style={styles.subtitle}>Redirecting to login...</p>
                    </>
                )}
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '60px 40px',
        maxWidth: '400px',
        width: '100%',
        textAlign: 'center',
    },
    spinner: {
        width: '60px',
        height: '60px',
        margin: '0 auto 24px',
        border: '4px solid #e2e8f0',
        borderTop: '4px solid #667eea',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    successIcon: {
        width: '60px',
        height: '60px',
        margin: '0 auto 24px',
        backgroundColor: '#48bb78',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        color: 'white',
        fontWeight: 'bold',
    },
    errorIcon: {
        width: '60px',
        height: '60px',
        margin: '0 auto 24px',
        backgroundColor: '#f56565',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        color: 'white',
        fontWeight: 'bold',
    },
    title: {
        fontSize: '24px',
        fontWeight: '600',
        color: '#1a202c',
        margin: '0 0 12px',
    },
    subtitle: {
        fontSize: '14px',
        color: '#718096',
        margin: 0,
    },
};

// Add keyframes for spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default AuthCallback;
