'use client';

import { Box, Container, Typography, Card, CardContent, CardActions, Button, Grid2 } from '@mui/material';
import { useRouter } from 'next/navigation';
import { ClientAuthWrapper } from '../src/core/components/auth/ClientAuthWrapper';

interface VersionCard {
  id: string;
  name: string;
  description: string;
  route: string;
  color: string;
  status?: 'current' | 'testing' | 'deprecated';
}

const clientVersions: VersionCard[] = [
  {
    id: 'v1',
    name: 'Version 1',
    description: 'Current stable version with 4-panel layout',
    route: '/client/v1',
    color: '#1976d2', // primary blue
    status: 'current',
  },
  {
    id: 'v2',
    name: 'Version 2',
    description: 'Testing new features',
    route: '/client/v2',
    color: '#2e7d32', // green
    status: 'testing',
  },
  {
    id: 'v3',
    name: 'Version 3',
    description: 'Experimental version',
    route: '/client/v3',
    color: '#ed6c02', // orange
    status: 'testing',
  },
];

export default function NavigationHub() {
  const router = useRouter();

  return (
    <ClientAuthWrapper>
      {(handleLogout) => (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', py: 4 }}>
          <Container maxWidth="lg">
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold' }}>
                AI Optimism Toolkit
              </Typography>
              <Button variant="outlined" onClick={handleLogout}>
                Logout
              </Button>
            </Box>

            <Typography variant="h5" sx={{ mb: 3, color: 'text.secondary' }}>
              Select Interface
            </Typography>

            <Grid2 container spacing={3}>
              {/* Client Versions */}
              {clientVersions.map((version) => (
                <Grid2 xs={12} sm={6} md={4} key={version.id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: version.status === 'current' ? 2 : 1,
                      borderColor: version.status === 'current' ? version.color : 'divider',
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: version.color,
                            mr: 1,
                          }}
                        />
                        <Typography variant="h6" component="h2">
                          {version.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {version.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => router.push(version.route)}
                        sx={{ bgcolor: version.color, '&:hover': { bgcolor: version.color, opacity: 0.9 } }}
                      >
                        Open
                      </Button>
                    </CardActions>
                  </Card>
                </Grid2>
              ))}

              {/* Researcher Portal */}
              <Grid2 xs={12} sm={6} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: 2,
                    borderColor: 'purple',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: 'purple',
                          mr: 1,
                        }}
                      />
                      <Typography variant="h6" component="h2">
                        Researcher Portal
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Manage sessions and monitor user interactions
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        bgcolor: 'purple',
                        color: 'white',
                      }}
                    >
                      ADMIN
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={() => router.push('/researcher')}
                      sx={{ bgcolor: 'purple', '&:hover': { bgcolor: 'purple', opacity: 0.9 } }}
                    >
                      Open
                    </Button>
                  </CardActions>
                </Card>
              </Grid2>
            </Grid2>
          </Container>
        </Box>
      )}
    </ClientAuthWrapper>
  );
}
