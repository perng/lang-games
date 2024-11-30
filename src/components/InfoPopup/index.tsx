import React from 'react';
import InfoIcon from '@mui/icons-material/Info';
import { IconButton, Popover, Typography, Link } from '@mui/material';

export function InfoPopup() {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000 }}>
      <IconButton onClick={handleClick} color="primary">
        <InfoIcon />
      </IconButton>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Typography sx={{ p: 2 }}>
          此英語學習遊戲正在開發中，歡迎您試用，在開發期間，使用者介面會不斷修改，英語資料也可能有錯誤，還請見諒，如果您發現有任何錯誤或有任何建議，請
          <br />
          <Link href="https://forms.gle/AuKcZyUYvtdsDuFH6" target="_blank" rel="noopener">
            提供意見回饋
          </Link>
        </Typography>
      </Popover>
    </div>
  );
} 