import { StyleSheet, Text, type TextProps } from 'react-native';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Font, NV } from '@/constants/nutrovia';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Font.regular,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontFamily: Font.bold,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontFamily: Font.regular,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  // Voz editorial: Newsreader Light itálica, solo a partir de 22px.
  title: {
    fontFamily: Font.serif,
    fontSize: 48,
    fontWeight: '300',
    lineHeight: 50,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: Font.serif,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '300',
    letterSpacing: -0.6,
  },
  link: {
    fontFamily: Font.regular,
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: Font.medium,
    lineHeight: 30,
    fontSize: 14,
    color: NV.savia700,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
