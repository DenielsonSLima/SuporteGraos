import React from 'react';
import { View, Image, Text } from '@react-pdf/renderer';
import { settingsService } from '../../services/settingsService';

export const PdfWatermark: React.FC = () => {
  const watermark = settingsService.getWatermark();

  if (!watermark.imageUrl) {
    // Marca d'água padrão (emoji/ícone)
    return (
      <View 
        fixed
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center',
          opacity: 0.05,
          zIndex: -1
        }}
      >
        <Text style={{ fontSize: 200, color: '#94a3b8' }}>🌾</Text>
      </View>
    );
  }

  // Marca d'água customizada
  return (
    <View
      fixed
      style={{
        position: 'absolute',
        top: '25%',
        left: '15%',
        right: '15%',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: watermark.opacity / 100,
        zIndex: -1
      }}
    >
      <Image 
        src={watermark.imageUrl}
        style={{
          width: '70%',
          objectFit: 'contain'
        }}
      />
    </View>
  );
};
