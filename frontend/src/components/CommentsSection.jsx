import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Divider,
  CircularProgress
} from '@mui/material';
import { getCardComments, createCardComment } from '../services/api';

const CommentsSection = ({ cardId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchComments = async () => {
    try {
      setLoading(true);
      const data = await getCardComments(cardId);
      setComments(data);
      setError('');
    } catch (error) {
      console.error('Ошибка при загрузке комментариев:', error);
      setError('Ошибка при загрузке комментариев');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cardId) {
      fetchComments();
    }
  }, [cardId]);

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await createCardComment(cardId, { content: newComment.trim() });
      setNewComment('');
      await fetchComments(); // Обновляем список комментариев
    } catch (error) {
      console.error('Ошибка при создании комментария:', error);
      setError('Ошибка при создании комментария');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Комментарии ({comments.length})
      </Typography>

      {error && (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Форма добавления комментария */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <form onSubmit={handleSubmitComment}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Добавить комментарий..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={submitting}
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={!newComment.trim() || submitting}
              size="small"
            >
              {submitting ? 'Отправка...' : 'Добавить комментарий'}
            </Button>
          </Box>
        </form>
      </Paper>

      {/* Список комментариев */}
      {comments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Пока нет комментариев
        </Typography>
      ) : (
        <Box>
          {comments.map((comment, index) => (
            <Box key={comment.id}>
              <Box sx={{ display: 'flex', gap: 2, py: 2 }}>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {comment.user?.username?.[0]?.toUpperCase() || '?'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {comment.user?.username || 'Неизвестный пользователь'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(comment.created_at)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {comment.content}
                  </Typography>
                </Box>
              </Box>
              {index < comments.length - 1 && <Divider />}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CommentsSection; 