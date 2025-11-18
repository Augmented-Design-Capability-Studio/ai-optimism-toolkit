'use client';

import { Box, Paper, TextField, IconButton, Typography, Avatar, Button, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAIProvider } from '../contexts/AIProviderContext';
import { useEffect, useRef, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps {
  onControlsGenerated?: (controls: unknown) => void;
}

export function ChatPanel({ onControlsGenerated }: ChatPanelProps) {
  const { state } = useAIProvider();
  const { apiKey, provider, model } = state;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  // Clear any stale chat state from previous sessions when no API key is present
  useEffect(() => {
    if (!apiKey && typeof window !== 'undefined') {
      // Clear any persisted chat state
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('chat-') || key.includes('optimization-chat')
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }, [apiKey]);

  // Create transport with body containing API key, provider, and model
  const transport = useMemo(() => {
    return new DefaultChatTransport({
      api: '/api/chat',
      body: {
        apiKey: apiKey || '', // Pass empty string if no key (will be rejected by API)
        provider: provider || 'google',
        model: model || 'gemini-2.0-flash',
      },
    });
  }, [apiKey, provider, model]);

  // Use useChat with custom transport
  // Use a unique ID per session to avoid loading stale chats when not connected
  const chatId = apiKey ? 'optimization-chat' : 'optimization-chat-disconnected';
  
  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
  });
  
  const isLoading = status === 'streaming';
  const [isGenerating, setIsGenerating] = useState(false);

  // Extract conversation text for generation
  const getConversationText = () => {
    return messages
      .map(m => {
        const text = m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || '';
        return `${m.role}: ${text}`;
      })
      .join('\n');
  };

  // Generate controls from conversation
  const handleGenerateControls = async () => {
    if (!apiKey) {
      alert('Please connect to an AI provider first');
      return;
    }

    setIsGenerating(true);
    try {
      const conversationText = getConversationText();
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          description: conversationText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.statusText}`);
      }

      const controls = await response.json();
      console.log('[ChatPanel] Generated controls:', controls);
      
      // Pass to parent component
      if (onControlsGenerated) {
        onControlsGenerated(controls);
      }

    } catch (error) {
      console.error('[ChatPanel] Generation error:', error);
      alert('Failed to generate controls. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Log errors (but suppress API key errors when not connected)
  useEffect(() => {
    if (error && apiKey) {
      console.error('[ChatPanel] Chat error:', error);
    }
  }, [error, apiKey]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!apiKey) {
      alert('Please connect to an AI provider first');
      return;
    }
    
    // Send message with proper structure: role and parts array
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: input }],
    });
    
    setInput('');
  };

  return (
    <Paper
      elevation={2}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
        }}
      >
        <Typography variant="h6" fontWeight="bold">
          💬 Chat Assistant
        </Typography>
        <Typography variant="caption">
          Describe your optimization problem
        </Typography>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {/* Show connection prompt if no API key */}
        {!apiKey && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'flex-start',
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'warning.main',
                width: 32,
                height: 32,
              }}
            >
              ⚠️
            </Avatar>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '80%',
                bgcolor: 'warning.light',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {`Please connect to an AI provider first!

Click the "AI Connection" button in the top-right corner to configure your API key.`}
              </Typography>
            </Paper>
          </Box>
        )}

        {/* Welcome message if connected but no messages yet */}
        {apiKey && messages.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              alignItems: 'flex-start',
            }}
          >
            <Avatar
              sx={{
                bgcolor: 'secondary.main',
                width: 32,
                height: 32,
              }}
            >
              🤖
            </Avatar>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '80%',
                bgcolor: 'grey.100',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {`Welcome to the AI Optimism Toolkit! 👋

I'll help you design your optimization problem. Let's start by understanding what you're trying to optimize.

What problem would you like to solve? For example:
• Optimize a recipe
• Minimize manufacturing costs
• Maximize energy efficiency
• Design an optimal schedule

Describe your problem, and I'll help you define variables, constraints, and objectives.`}
              </Typography>
            </Paper>
          </Box>
        )}
        
        {/* Chat messages */}
        {messages.map((message: any) => {
          // Extract text from message - try multiple formats
          let textContent = '';
          
          // AI SDK v5 format with parts array
          if (message.parts && Array.isArray(message.parts)) {
            textContent = message.parts
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('');
          }
          // Legacy format with content string
          else if (typeof message.content === 'string') {
            textContent = message.content;
          }
          // Direct text property
          else if (message.text) {
            textContent = message.text;
          }
          // Fallback - stringify for debugging
          else {
            console.warn('[ChatPanel] Unknown message format:', message);
            textContent = JSON.stringify(message);
          }
          
          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'flex-start',
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              <Avatar
                sx={{
                  bgcolor: message.role === 'user' ? 'primary.main' : 'secondary.main',
                  width: 32,
                  height: 32,
                }}
              >
                {message.role === 'user' ? '👤' : '🤖'}
              </Avatar>
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  maxWidth: '80%',
                  bgcolor: message.role === 'user' ? 'primary.light' : 'grey.100',
                  color: message.role === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                {message.role === 'assistant' ? (
                  <Box
                    sx={{
                      '& p': { mb: 1 },
                      '& ul, & ol': { pl: 2, mb: 1 },
                      '& li': { mb: 0.5 },
                      '& code': {
                        bgcolor: 'grey.200',
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        fontFamily: 'monospace',
                        fontSize: '0.875em',
                      },
                      '& pre': {
                        bgcolor: 'grey.200',
                        p: 1,
                        borderRadius: 1,
                        overflow: 'auto',
                        mb: 1,
                      },
                      '& pre code': {
                        bgcolor: 'transparent',
                        p: 0,
                      },
                      '& table': {
                        borderCollapse: 'collapse',
                        width: '100%',
                        mb: 1,
                      },
                      '& th, & td': {
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 1,
                        textAlign: 'left',
                      },
                      '& th': {
                        bgcolor: 'grey.200',
                        fontWeight: 'bold',
                      },
                      '& h1, & h2, & h3, & h4, & h5, & h6': {
                        mt: 2,
                        mb: 1,
                        fontWeight: 'bold',
                      },
                      '& blockquote': {
                        borderLeft: '4px solid',
                        borderColor: 'primary.main',
                        pl: 2,
                        my: 1,
                        color: 'text.secondary',
                      },
                    }}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {textContent}
                    </ReactMarkdown>
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {textContent}
                  </Typography>
                )}
              </Paper>
            </Box>
          );
        })}
        {isLoading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
              🤖
            </Avatar>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CircularProgress size={16} thickness={5} />
              <Typography variant="body2" color="text.secondary">
                Thinking...
              </Typography>
            </Paper>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Generate Controls Button */}
      {messages.length > 0 && apiKey && (
        <Box
          sx={{
            px: 2,
            pb: 1,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Button
            fullWidth
            variant="contained"
            color="secondary"
            startIcon={isGenerating ? <CircularProgress size={16} /> : <AutoFixHighIcon />}
            onClick={handleGenerateControls}
            disabled={isGenerating || isLoading}
            sx={{ py: 1 }}
          >
            {isGenerating ? 'Generating Controls...' : '✨ Generate Controls Panel'}
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Extract variables, properties, and constraints from the conversation
          </Typography>
        </Box>
      )}

      {/* Input */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Describe your optimization problem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading || !apiKey}
        />
        <IconButton
          type="submit"
          color="primary"
          disabled={isLoading || !input.trim() || !apiKey}
        >
          <SendIcon />
        </IconButton>
      </Box>

      {!apiKey && (
        <Box sx={{ p: 2, bgcolor: 'warning.light', textAlign: 'center' }}>
          <Typography variant="caption" color="warning.dark">
            Please configure your AI API key in the top right corner
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
