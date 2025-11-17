import { Box, Typography, AppBar, Toolbar } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIConnectionStatus } from './components/AIConnectionStatus';
import { AIProviderProvider } from './contexts/AIProviderContext';

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AIProviderProvider>
                <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
                    <AppBar position="fixed">
                        <Toolbar>
                            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
                                <AIConnectionStatus />
                            </Box>
                            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                                AI OPTIMISM TOOLKIT
                            </Typography>
                            <Box sx={{ flex: 1 }} />
                        </Toolbar>
                    </AppBar>
                    <Toolbar /> {/* This toolbar is a spacer */}
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
                        <Typography variant="h5" color="text.secondary">
                            Ready for new frontend
                        </Typography>
                    </Box>
                </Box>
            </AIProviderProvider>
        </QueryClientProvider>
    );
}

export default App;
