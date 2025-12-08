/**
 * Toolbar component for researcher message input
 * Contains AI generation buttons, formalize controls, and preview checkbox
 */

import { Box, IconButton, Tooltip, Checkbox, FormControlLabel, CircularProgress, Divider, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VariableIcon from '@mui/icons-material/Tune';
import PropertyIcon from '@mui/icons-material/Functions';
import ObjectiveIcon from '@mui/icons-material/Flag';
import ConstraintIcon from '@mui/icons-material/Block';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ResearcherToolbarProps {
  sessionId: string;
  hasAIConfig: boolean;
  disabled?: boolean;
  sessionStatus?: 'active' | 'waiting' | 'formalized' | 'completed';
  readyToFormalize?: boolean;
  isFormalizing?: boolean;
  showPreview: boolean;
  onPreviewChange: (checked: boolean) => void;
  onAIResponse: () => void;
  onComponentGenerate: (component: 'variables' | 'properties' | 'objectives' | 'constraints') => void;
  onToggleReadyToFormalize?: () => void;
  onFormalize?: () => void;
  onResetFormalization?: () => void;
  isGeneratingAI?: boolean;
  isGeneratingComponent?: string | null;
}

export function ResearcherToolbar({
  sessionId,
  hasAIConfig,
  disabled = false,
  sessionStatus,
  readyToFormalize = false,
  isFormalizing = false,
  showPreview,
  onPreviewChange,
  onAIResponse,
  onComponentGenerate,
  onToggleReadyToFormalize,
  onFormalize,
  onResetFormalization,
  isGeneratingAI = false,
  isGeneratingComponent = null,
}: ResearcherToolbarProps) {
  const isDisabled = disabled || sessionStatus === 'completed';
  const aiButtonDisabled = !hasAIConfig || isGeneratingAI || isDisabled;
  const componentButtonDisabled = !hasAIConfig || !!isGeneratingComponent || isDisabled;
  const canFormalize = sessionStatus !== 'formalized' && sessionStatus !== 'completed';

  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        gap: 1,
        alignItems: 'center',
        flexWrap: 'wrap',
        bgcolor: 'grey.50',
      }}
    >
      {/* AI Response Button */}
      <Tooltip 
        title={isGeneratingAI ? "Generating AI response..." : "Draft an AI response based on conversation"}
        arrow
      >
        <span>
          <IconButton
            color="secondary"
            onClick={onAIResponse}
            disabled={aiButtonDisabled}
            size="small"
            sx={{
              opacity: isGeneratingAI ? 0.6 : 1,
            }}
          >
            {isGeneratingAI ? (
              <CircularProgress size={16} />
            ) : (
              <AutoAwesomeIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>

      {/* Vertical Separator */}
      <Divider orientation="vertical" flexItem sx={{ height: 24, mx: 0.5 }} />

      {/* Component Generation Buttons */}
      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <Tooltip title="Generate Variables" arrow>
          <span>
            <IconButton
              color="primary"
              onClick={() => onComponentGenerate('variables')}
              disabled={componentButtonDisabled || isGeneratingComponent === 'variables'}
              size="small"
            >
              {isGeneratingComponent === 'variables' ? (
                <CircularProgress size={16} />
              ) : (
                <VariableIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Generate Properties (optional)" arrow>
          <span>
            <IconButton
              color="primary"
              onClick={() => onComponentGenerate('properties')}
              disabled={componentButtonDisabled || isGeneratingComponent === 'properties'}
              size="small"
            >
              {isGeneratingComponent === 'properties' ? (
                <CircularProgress size={16} />
              ) : (
                <PropertyIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Generate Objectives" arrow>
          <span>
            <IconButton
              color="primary"
              onClick={() => onComponentGenerate('objectives')}
              disabled={componentButtonDisabled || isGeneratingComponent === 'objectives'}
              size="small"
            >
              {isGeneratingComponent === 'objectives' ? (
                <CircularProgress size={16} />
              ) : (
                <ObjectiveIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Generate Constraints" arrow>
          <span>
            <IconButton
              color="primary"
              onClick={() => onComponentGenerate('constraints')}
              disabled={componentButtonDisabled || isGeneratingComponent === 'constraints'}
              size="small"
            >
              {isGeneratingComponent === 'constraints' ? (
                <CircularProgress size={16} />
              ) : (
                <ConstraintIcon fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Vertical Separator */}
      <Divider orientation="vertical" flexItem sx={{ height: 24, mx: 0.5 }} />

      {/* Formalize Controls */}
      {canFormalize && onToggleReadyToFormalize && (
        <>
          <FormControlLabel
            control={
              <Checkbox
                checked={readyToFormalize === true}
                onChange={onToggleReadyToFormalize}
                size="small"
                sx={{
                  color: readyToFormalize ? 'success.main' : 'default',
                  '&.Mui-checked': {
                    color: 'success.main',
                  },
                  padding: '2px',
                  '& .MuiSvgIcon-root': {
                    fontSize: '1rem',
                  },
                }}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Ready
              </Typography>
            }
            sx={{
              m: 0,
              mr: 0.5,
              '& .MuiFormControlLabel-label': {
                fontSize: '0.75rem',
                ml: 0.5,
              },
            }}
          />
          {onFormalize && (
            <Tooltip title={isFormalizing ? "Formalizing..." : "Formalize Problem"} arrow>
              <span>
                <IconButton
                  color="secondary"
                  onClick={onFormalize}
                  disabled={isFormalizing || isDisabled}
                  size="small"
                >
                  {isFormalizing ? (
                    <CircularProgress size={16} />
                  ) : (
                    <AutoFixHighIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          )}
        </>
      )}

      {sessionStatus === 'formalized' && onResetFormalization && (
        <Tooltip title="Reset Formalization" arrow>
          <span>
            <IconButton
              color="warning"
              onClick={onResetFormalization}
              disabled={isDisabled}
              size="small"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}

      {/* Spacer */}
      <Box sx={{ flex: 1 }} />

      {/* Preview Checkbox */}
      <FormControlLabel
        control={
          <Checkbox
            checked={showPreview}
            onChange={(e) => onPreviewChange(e.target.checked)}
            size="small"
            disabled={disabled}
            sx={{
              padding: '2px',
              '& .MuiSvgIcon-root': {
                fontSize: '1rem',
              },
            }}
          />
        }
        label="Preview"
        sx={{
          m: 0,
          '& .MuiFormControlLabel-label': {
            fontSize: '0.75rem',
            ml: 0.5,
          },
        }}
      />
    </Box>
  );
}

