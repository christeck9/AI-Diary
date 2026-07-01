// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chat': 'chat',
  'message.fill': 'chat',
  'server.rack': 'dns',
  'cpu': 'memory',
  'person.fill': 'person',
  'antenna.radiowaves.left.and.right': 'sensors',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'externaldrive': 'storage',
  'chart.bar.xaxis': 'bar-chart',
  'bolt.horizontal': 'bolt',
  'timer': 'timer',
  'paintbrush.fill': 'brush',
  'trash.fill': 'delete',
  'eyeglasses': 'face',
  'waveform': 'mic',
  'equalizer': 'graphic-eq',
  'terminal': 'terminal',
  'folder.fill': 'folder',
  'paperclip': 'attach-file',
  'camera.fill': 'camera-alt',
  'photo.fill': 'photo',
  'doc.fill': 'description',
  'brain.head.profile': 'psychology-alt',
  'slider.horizontal.3': 'tune',
  'stop.circle.fill': 'stop-circle',
  'xmark': 'close',
  'chevron.up': 'expand-less',
  'chevron.down': 'expand-more',
  'flask.fill': 'science',
  'person.wave.2.fill': 'hearing',
  'books.vertical.fill': 'library-books',
  'trash': 'delete',
  'battery.25': 'battery-alert',
  'xmark.circle.fill': 'cancel',
  'exclamationmark.triangle': 'warning',
  'chevron.up.chevron.down': 'unfold-more',
  'waveform.path': 'gesture',
  'doc.on.doc': 'content-copy',
  'lock.shield.fill': 'security',
  'chevron.left': 'chevron-left',
  'brain': 'psychology-alt',
  'checkmark.circle.fill': 'check-circle',
  'lock.fill': 'lock',
  'square.and.arrow.up': 'share',
  'doc.plaintext.fill': 'description',
  'doc.text.fill': 'article',
  'waveform.slash': 'mic-off',
  'voice.active': 'record-voice-over',
  'voice.muted': 'voice-over-off',
  'play.circle.fill': 'play-circle-filled',
  'volume.up.circle.fill': 'volume-up',
  'spiral': 'cyclone',
  'globe': 'public',
  'leaf.fill': 'eco',
  'wrench.fill': 'build',
  'gearshape.fill': 'settings',
  'pencil': 'edit',
  'list.bullet.clipboard.fill': 'assignment',
  'calendar': 'calendar-today',
  'plus': 'add',
  'pause.fill': 'pause',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
} as const;

type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: any;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
