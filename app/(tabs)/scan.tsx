
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack } from 'expo-router';
import { useState } from 'react';

import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';

export default function ScanScreen() {
    const { theme } = useTheme();

    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [mimeType, setMimeType] = useState<string>('image/jpeg');
    const [loading, setLoading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    const showMessage = (message: string) => {
        if (Platform.OS === 'web') {
            window.alert(message);
        } else {
            Alert.alert('Poultriz', message);
        }
    };

    const saveSelectedImage = (asset: any) => {
        if (!asset?.uri || !asset?.base64) {
            showMessage(
                'Could not read this image. Please select another photo.',
            );
            return;
        }

        const fileName = asset.fileName?.toLowerCase() ?? '';
        const originalMimeType = asset.mimeType?.toLowerCase() ?? '';

        let detectedMimeType = 'image/jpeg';

        if (
            originalMimeType === 'image/png' ||
            fileName.endsWith('.png')
        ) {
            detectedMimeType = 'image/png';
        } else if (
            originalMimeType === 'image/webp' ||
            fileName.endsWith('.webp')
        ) {
            detectedMimeType = 'image/webp';
        } else if (
            originalMimeType === 'image/jpeg' ||
            originalMimeType === 'image/jpg' ||
            fileName.endsWith('.jpg') ||
            fileName.endsWith('.jpeg')
        ) {
            detectedMimeType = 'image/jpeg';
        }

        setImageUri(asset.uri);
        setImageBase64(asset.base64);
        setMimeType(detectedMimeType);
        setAnalysis(null);
        setAnalysisError(null);
    };

    const openCamera = async () => {
        try {
            setLoading(true);

            if (Platform.OS !== 'web') {
                const permission =
                    await ImagePicker.requestCameraPermissionsAsync();

                if (!permission.granted) {
                    showMessage(
                        'Camera permission is required to scan poultry droppings.',
                    );
                    return;
                }
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets.length > 0) {
                saveSelectedImage(result.assets[0]);
            }
        } catch {
            showMessage(
                'Unable to open the camera. Please try again or select an image.',
            );
        } finally {
            setLoading(false);
        }
    };

    const selectImage = async () => {
        try {
            setLoading(true);

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.7,
                base64: true,
            });

            if (!result.canceled && result.assets.length > 0) {
                saveSelectedImage(result.assets[0]);
            }
        } catch {
            showMessage('Unable to select the image. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetScan = () => {
        setImageUri(null);
        setImageBase64(null);
        setMimeType('image/jpeg');
        setAnalysis(null);
        setAnalysisError(null);
    };

    const analyzeImage = async () => {
        if (!imageUri || !imageBase64) {
            showMessage(
                'Please take a photo or choose an image before starting the analysis.',
            );
            return;
        }

        setAnalyzing(true);
        setAnalysis(null);
        setAnalysisError(null);

        try {
            const { data, error } = await supabase.functions.invoke(
                'analyze-droppings',
                {
                    body: {
                        imageBase64,
                        mimeType,
                    },
                },
            );

            if (error) {
                let serverMessage = '';

                const functionError = error as Error & {
                    context?: Response;
                };

                try {
                    if (functionError.context) {
                        const responseText =
                            await functionError.context.clone().text();

                        if (responseText) {
                            const responseData = JSON.parse(responseText);

                            if (typeof responseData.error === 'string') {
                                serverMessage = responseData.error;
                            } else if (
                                typeof responseData.message === 'string'
                            ) {
                                serverMessage = responseData.message;
                            }
                        }
                    }
                } catch {
                    // Use a friendly fallback if the response cannot be read.
                }

                if (!serverMessage) {
                    const status = functionError.context?.status;

                    if (status === 401 || status === 403) {
                        serverMessage =
                            'Your session may have expired. Please sign in again and try again.';
                    } else if (status === 413) {
                        serverMessage =
                            'This photo is too large. Please choose a smaller image.';
                    } else if (status === 429) {
                        serverMessage =
                            'The AI service is temporarily busy. Please try again later.';
                    } else if (status && status >= 500) {
                        serverMessage =
                            'AI analysis is temporarily unavailable. Please try again later.';
                    } else {
                        serverMessage =
                            'We could not analyze your photo. Please try again later.';
                    }
                }

                throw new Error(serverMessage);
            }

            if (data?.error) {
                throw new Error(
                    typeof data.error === 'string'
                        ? data.error
                        : 'We could not analyze your photo. Please try again later.',
                );
            }

            if (
                typeof data?.analysis !== 'string' ||
                !data.analysis.trim()
            ) {
                throw new Error(
                    'No analysis was returned. Please try again later.',
                );
            }

            setAnalysis(data.analysis);
            setAnalysisError(null);
        } catch (error: unknown) {
            const message =
                error instanceof Error && error.message
                    ? error.message
                    : 'AI analysis is temporarily unavailable. Please try again later.';

            // Display expected analysis failures inside the screen.
            // Do not log them as Expo development errors.
            setAnalysisError(message);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor: theme.screenBackground },
            ]}
            edges={['top', 'left', 'right']}
        >
            <Stack.Screen
                options={{
                    title: 'AI Health Scan',
                    headerShown: false,
                }}
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTextContainer}>
                        <Text
                            style={[
                                styles.eyebrow,
                                { color: theme.textMuted },
                            ]}
                        >
                            POULTRIZ HEALTH
                        </Text>

                        <Text
                            style={[
                                styles.title,
                                { color: theme.text },
                            ]}
                        >
                            AI Droppings Scan
                        </Text>

                        <Text
                            style={[
                                styles.subtitle,
                                { color: theme.textMuted },
                            ]}
                        >
                            Check unusual droppings and record flock health.
                        </Text>
                    </View>

                    <View
                        style={[
                            styles.headerIcon,
                            { backgroundColor: theme.cardBackground },
                        ]}
                    >
                        <Ionicons
                            name="scan-outline"
                            size={28}
                            color="#8BC34A"
                        />
                    </View>
                </View>

                {/* Scanner Card */}
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.cardBackground,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <View style={styles.cardHeading}>
                        <Text
                            style={[
                                styles.cardTitle,
                                { color: theme.text },
                            ]}
                        >
                            {imageUri
                                ? 'Image captured'
                                : 'Scan your droppings'}
                        </Text>

                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />

                            <Text style={styles.statusText}>
                                {analyzing
                                    ? 'Analyzing'
                                    : analysis
                                      ? 'Analysis complete'
                                      : analysisError
                                        ? 'Analysis unavailable'
                                        : imageUri
                                          ? 'Image ready'
                                          : 'Ready to scan'}
                            </Text>
                        </View>
                    </View>

                    {/* Image Preview */}
                    {imageUri ? (
                        <View style={styles.previewContainer}>
                            <Image
                                source={{ uri: imageUri }}
                                style={styles.previewImage}
                                resizeMode="cover"
                                accessibilityLabel="Selected poultry droppings image"
                            />

                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={resetScan}
                                disabled={analyzing}
                                accessibilityLabel="Remove selected image"
                                accessibilityRole="button"
                            >
                                <Ionicons
                                    name="close"
                                    size={22}
                                    color="#FFFFFF"
                                />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View
                            style={[
                                styles.cameraPlaceholder,
                                {
                                    backgroundColor: theme.screenBackground,
                                },
                            ]}
                        >
                            <View style={styles.scanFrame}>
                                <View
                                    style={[styles.corner, styles.topLeft]}
                                />
                                <View
                                    style={[styles.corner, styles.topRight]}
                                />
                                <View
                                    style={[styles.corner, styles.bottomLeft]}
                                />
                                <View
                                    style={[styles.corner, styles.bottomRight]}
                                />

                                <Ionicons
                                    name="camera-outline"
                                    size={54}
                                    color="#8BC34A"
                                />

                                <Text
                                    style={[
                                        styles.placeholderTitle,
                                        { color: theme.text },
                                    ]}
                                >
                                    Ready for your scan?
                                </Text>

                                <Text
                                    style={[
                                        styles.placeholderText,
                                        { color: theme.textMuted },
                                    ]}
                                >
                                    Position the camera over fresh droppings in
                                    good light.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Instructions */}
                    <View style={styles.instructionRow}>
                        <Ionicons
                            name="information-circle-outline"
                            size={21}
                            color="#8BC34A"
                        />

                        <Text
                            style={[
                                styles.instructionText,
                                { color: theme.textMuted },
                            ]}
                        >
                            Use a clear, well-lit image. Avoid mixing droppings
                            with litter or other materials.
                        </Text>
                    </View>

                    {/* Camera Button */}
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            (loading || analyzing) && styles.disabledButton,
                        ]}
                        onPress={openCamera}
                        disabled={loading || analyzing}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <Ionicons
                                    name="camera"
                                    size={22}
                                    color="#FFFFFF"
                                />

                                <Text style={styles.primaryButtonText}>
                                    Open Camera
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Gallery Button */}
                    <TouchableOpacity
                        style={[
                            styles.secondaryButton,
                            {
                                borderColor: theme.border,
                                backgroundColor: theme.cardBackground,
                                opacity: loading || analyzing ? 0.6 : 1,
                            },
                        ]}
                        onPress={selectImage}
                        disabled={loading || analyzing}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                    >
                        <Ionicons
                            name="images-outline"
                            size={21}
                            color={theme.text}
                        />

                        <Text
                            style={[
                                styles.secondaryButtonText,
                                { color: theme.text },
                            ]}
                        >
                            Choose from Gallery
                        </Text>
                    </TouchableOpacity>

                    {/* Analyze Button */}
                    {imageUri && (
                        <TouchableOpacity
                            style={[
                                styles.analyzeButton,
                                analyzing && styles.disabledButton,
                            ]}
                            onPress={analyzeImage}
                            disabled={analyzing || loading}
                            activeOpacity={0.85}
                            accessibilityRole="button"
                        >
                            {analyzing ? (
                                <>
                                    <ActivityIndicator color="#FFFFFF" />

                                    <Text style={styles.primaryButtonText}>
                                        Analyzing Image...
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons
                                        name="sparkles"
                                        size={21}
                                        color="#FFFFFF"
                                    />

                                    <Text style={styles.primaryButtonText}>
                                        {analysis || analysisError
                                            ? 'Try Again'
                                            : 'Analyze Image'}
                                    </Text>

                                    <Ionicons
                                        name="arrow-forward"
                                        size={20}
                                        color="#FFFFFF"
                                    />
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    {/* Analysis Error */}
                    {analysisError && (
                        <View
                            style={[
                                styles.errorCard,
                                {
                                    backgroundColor: theme.cardBackgroundAlt,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <View style={styles.errorHeader}>
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={25}
                                    color={theme.danger}
                                />

                                <Text
                                    style={[
                                        styles.errorTitle,
                                        { color: theme.text },
                                    ]}
                                >
                                    Analysis Unavailable
                                </Text>
                            </View>

                            <Text
                                style={[
                                    styles.errorMessage,
                                    { color: theme.textMuted },
                                ]}
                            >
                                {analysisError}
                            </Text>

                            <TouchableOpacity
                                onPress={() => setAnalysisError(null)}
                                style={styles.dismissButton}
                                accessibilityRole="button"
                            >
                                <Text
                                    style={[
                                        styles.dismissText,
                                        { color: theme.accent },
                                    ]}
                                >
                                    Dismiss
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Analysis Results */}
                    {analysis && (
                        <View
                            style={[
                                styles.resultsCard,
                                {
                                    backgroundColor: theme.screenBackground,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <View style={styles.resultsHeader}>
                                <View style={styles.resultsIcon}>
                                    <Ionicons
                                        name="sparkles"
                                        size={21}
                                        color="#8BC34A"
                                    />
                                </View>

                                <View style={styles.resultsHeadingText}>
                                    <Text
                                        style={[
                                            styles.resultsTitle,
                                            { color: theme.text },
                                        ]}
                                    >
                                        AI Scan Results
                                    </Text>

                                    <Text
                                        style={[
                                            styles.resultsSubtitle,
                                            { color: theme.textMuted },
                                        ]}
                                    >
                                        Visual assessment of your image
                                    </Text>
                                </View>
                            </View>

                            <View
                                style={[
                                    styles.resultsDivider,
                                    { backgroundColor: theme.border },
                                ]}
                            />

                            <Text
                                selectable
                                style={[
                                    styles.analysisText,
                                    { color: theme.text },
                                ]}
                            >
                                {analysis}
                            </Text>

                            <View style={styles.disclaimer}>
                                <Ionicons
                                    name="information-circle-outline"
                                    size={20}
                                    color="#8BC34A"
                                />

                                <Text style={styles.disclaimerText}>
                                    This AI assessment is not a veterinary
                                    diagnosis. Consult a qualified poultry
                                    veterinarian if birds are unwell or symptoms
                                    persist.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Ready Notice */}
                    {imageUri &&
                        !analysis &&
                        !analyzing &&
                        !analysisError && (
                            <View style={styles.readyNotice}>
                                <Ionicons
                                    name="checkmark-circle"
                                    size={22}
                                    color="#4CAF50"
                                />

                                <Text style={styles.readyText}>
                                    Your image is ready. Tap Analyze Image to
                                    receive an AI-powered visual assessment.
                                </Text>
                            </View>
                        )}
                </View>

                {/* Guidance */}
                <View
                    style={[
                        styles.guidanceCard,
                        { backgroundColor: theme.cardBackgroundAlt },
                    ]}
                >
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={24}
                        color="#8BC34A"
                    />

                    <View style={styles.guidanceContent}>
                        <Text
                            style={[
                                styles.guidanceTitle,
                                { color: theme.text },
                            ]}
                        >
                            Your flock's health matters
                        </Text>

                        <Text
                            style={[
                                styles.guidanceText,
                                { color: theme.textMuted },
                            ]}
                        >
                            An image alone cannot confirm a disease. Poultriz
                            helps organise observations and guide you toward
                            appropriate veterinary advice.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    content: {
        paddingHorizontal: 18,
        paddingTop: 20,
        paddingBottom: 32,
        width: '100%',
        maxWidth: 760,
        alignSelf: 'center',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },

    headerTextContainer: {
        flex: 1,
    },

    eyebrow: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 7,
    },

    title: {
        fontSize: 25,
        fontWeight: '800',
        letterSpacing: -0.5,
    },

    subtitle: {
        fontSize: 13,
        marginTop: 7,
        lineHeight: 19,
        maxWidth: 340,
    },

    headerIcon: {
        width: 54,
        height: 54,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },

    card: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 16,
        marginBottom: 18,
    },

    cardHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 18,
        flexWrap: 'wrap',
    },

    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#8BC34A1A',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 7,
        gap: 6,
    },

    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#8BC34A',
    },

    statusText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#689F38',
    },

    cameraPlaceholder: {
        minHeight: 280,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
    },

    scanFrame: {
        width: '100%',
        minHeight: 230,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 22,
        position: 'relative',
    },

    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#8BC34A',
    },

    topLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 10,
    },

    topRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: 10,
    },

    bottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: 10,
    },

    bottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: 10,
    },

    placeholderTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 16,
        textAlign: 'center',
    },

    placeholderText: {
        fontSize: 12,
        lineHeight: 19,
        textAlign: 'center',
        marginTop: 8,
        maxWidth: 270,
    },

    previewContainer: {
        width: '100%',
        height: 300,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000000',
    },

    previewImage: {
        width: '100%',
        height: '100%',
    },

    removeButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    instructionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        marginTop: 16,
        marginBottom: 20,
    },

    instructionText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 19,
    },

    primaryButton: {
        minHeight: 52,
        borderRadius: 14,
        backgroundColor: '#8BC34A',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 16,
    },

    disabledButton: {
        opacity: 0.65,
    },

    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    secondaryButton: {
        minHeight: 50,
        borderRadius: 14,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: 10,
    },

    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },

    analyzeButton: {
        minHeight: 54,
        borderRadius: 14,
        backgroundColor: '#689F38',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 16,
        marginTop: 18,
    },

    readyNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 9,
        backgroundColor: '#4CAF5014',
        borderRadius: 12,
        padding: 12,
        marginTop: 16,
    },

    readyText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: '#4CAF50',
    },

    errorCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginTop: 18,
    },

    errorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },

    errorTitle: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
    },

    errorMessage: {
        fontSize: 14,
        lineHeight: 21,
    },

    dismissButton: {
        alignSelf: 'flex-start',
        marginTop: 14,
        paddingVertical: 6,
        paddingHorizontal: 2,
    },

    dismissText: {
        fontSize: 14,
        fontWeight: '700',
    },

    resultsCard: {
        borderWidth: 1,
        borderRadius: 16,
        padding: 15,
        marginTop: 20,
    },

    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
    },

    resultsIcon: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: '#8BC34A1A',
        alignItems: 'center',
        justifyContent: 'center',
    },

    resultsHeadingText: {
        flex: 1,
    },

    resultsTitle: {
        fontSize: 17,
        fontWeight: '800',
    },

    resultsSubtitle: {
        fontSize: 12,
        marginTop: 4,
    },

    resultsDivider: {
        height: 1,
        marginVertical: 15,
    },

    analysisText: {
        fontSize: 14,
        lineHeight: 23,
    },

    disclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        backgroundColor: '#8BC34A14',
        borderRadius: 12,
        padding: 12,
        marginTop: 18,
    },

    disclaimerText: {
        flex: 1,
        color: '#689F38',
        fontSize: 12,
        lineHeight: 18,
    },

    guidanceCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        borderRadius: 18,
    },

    guidanceContent: {
        flex: 1,
    },

    guidanceTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 6,
    },

    guidanceText: {
        fontSize: 12,
        lineHeight: 19,
    },
});