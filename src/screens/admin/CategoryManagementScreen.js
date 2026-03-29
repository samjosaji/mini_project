import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
    ActivityIndicator, Alert, RefreshControl, Modal, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { adminService } from '../../services/adminService';

export default function CategoryManagementScreen({ navigation }) {
    const [categories, setCategories] = useState([]);
    const [filteredCategories, setFilteredCategories] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modal state for cross-platform prompt (Android doesn't support Alert.prompt)
    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState('add'); // 'add' or 'edit'
    const [modalInput, setModalInput] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [pendingRequests, setPendingRequests] = useState([]);

    const loadCategories = useCallback(async () => {
        try {
            const { data } = await adminService.getCategories();
            if (data) {
                setCategories(data);
            }

            // Also load pending category requests
            const { data: pending } = await adminService.getPendingCategoryRequests();
            if (pending) {
                setPendingRequests(pending);
            }
        } catch (err) {
            console.error('Error loading categories:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadCategories();
    }, [loadCategories]);

    useEffect(() => {
        if (!search.trim()) {
            setFilteredCategories(categories);
        } else {
            const q = search.trim().toLowerCase();
            setFilteredCategories(categories.filter(c => c.name.toLowerCase().includes(q)));
        }
    }, [categories, search]);

    const onRefresh = () => {
        setRefreshing(true);
        loadCategories();
    };

    const handleAddCategory = () => {
        setModalType('add');
        setModalInput('');
        setModalVisible(true);
    };

    const handleEditCategory = (cat) => {
        setModalType('edit');
        setSelectedCategory(cat);
        setModalInput(cat.name);
        setModalVisible(true);
    };

    const handleModalSubmit = async () => {
        const name = modalInput.trim();
        if (!name) {
            Alert.alert('Error', 'Category name cannot be empty');
            return;
        }

        if (modalType === 'add') {
            const { error } = await adminService.addCategory(name);
            if (error) {
                Alert.alert('Error', 'Failed to add category. Name might already exist.');
            } else {
                // Reload from DB to get the new ID and proper count
                loadCategories();
            }
        } else if (modalType === 'edit' && selectedCategory) {
            if (name !== selectedCategory.name) {
                const result = await adminService.updateProductCategory(selectedCategory.name, name);
                if (!result.error) {
                    loadCategories();
                } else {
                    Alert.alert('Error', 'Failed to update category name on existing products.');
                }
            }
        }

        setModalVisible(false);
        setModalInput('');
    };

    const handleDeleteCategory = (cat) => {
        Alert.alert(
            'Delete Category',
            `Are you sure you want to delete "${cat.name}"? Products in this category will be marked as "Uncategorized".`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        const result = await adminService.deleteCategory(cat.name);
                        if (!result.error) {
                            loadCategories();
                        } else {
                            Alert.alert('Error', 'Failed to delete category.');
                        }
                    }
                }
            ]
        );
    };

    const getIconBgColor = (name) => {
        const n = name.toLowerCase();
        if (n.includes('food')) return '#dcfce7';
        if (n.includes('fruit')) return '#ffedd5';
        if (n.includes('veg')) return '#dcfce7';
        if (n.includes('craft')) return '#f3e8ff';
        if (n.includes('bakery')) return '#fef3c7';
        if (n.includes('bev')) return '#e0f2fe';
        return '#f1f5f9';
    };

    const getIconColor = (name) => {
        const n = name.toLowerCase();
        if (n.includes('food')) return '#16a34a';
        if (n.includes('fruit')) return '#ea580c';
        if (n.includes('veg')) return '#15803d';
        if (n.includes('craft')) return '#9333ea';
        if (n.includes('bakery')) return '#b45309';
        if (n.includes('bev')) return '#0284c7';
        return Colors.gray500;
    };

    const handleApproveRequest = (request) => {
        Alert.alert(
            'Approve Category',
            `Approve "${request.name}" as a new category? Products using this category will become visible to all customers.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        const { error } = await adminService.approveCategoryRequest(request.id, request.name);
                        if (error) {
                            Alert.alert('Error', 'Failed to approve category.');
                        } else {
                            Alert.alert('Approved!', `"${request.name}" is now an active category.`);
                            loadCategories();
                        }
                    }
                }
            ]
        );
    };

    const handleRejectRequest = (request) => {
        Alert.alert(
            'Reject Category',
            `Reject "${request.name}"? Products using this category will be moved to "Uncategorized".`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await adminService.rejectCategoryRequest(request.id, request.name);
                        if (error) {
                            Alert.alert('Error', 'Failed to reject category.');
                        } else {
                            loadCategories();
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingWrap}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={Colors.textMain} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.headerSubtitle}>SETTINGS</Text>
                    <Text style={styles.headerTitle}>Category Management</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={handleAddCategory}>
                    <MaterialIcons name="add" size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <View style={styles.searchBar}>
                    <MaterialIcons name="search" size={20} color={Colors.gray400} style={{ marginLeft: 14 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search categories..."
                        placeholderTextColor={Colors.gray400}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>ALL CATEGORIES</Text>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{categories.length} Total</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            >
                {/* Pending Requests Section */}
                {pendingRequests.length > 0 && (
                    <View style={styles.pendingSection}>
                        <View style={styles.pendingHeader}>
                            <Text style={styles.pendingTitle}>PENDING REQUESTS</Text>
                            <View style={styles.pendingCountBadge}>
                                <Text style={styles.pendingCountText}>{pendingRequests.length} Pending</Text>
                            </View>
                        </View>
                        {pendingRequests.map(req => (
                            <View key={req.id} style={styles.pendingCard}>
                                <View style={styles.pendingCardLeft}>
                                    <View style={styles.pendingIconWrap}>
                                        <MaterialIcons name="pending-actions" size={22} color="#b45309" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.pendingCatName}>{req.name}</Text>
                                        <Text style={styles.pendingVendorName}>Suggested by {req.vendor_name}</Text>
                                    </View>
                                </View>
                                <View style={styles.pendingActions}>
                                    <TouchableOpacity
                                        style={styles.approveBtn}
                                        onPress={() => handleApproveRequest(req)}
                                    >
                                        <MaterialIcons name="check" size={20} color={Colors.white} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.rejectBtn}
                                        onPress={() => handleRejectRequest(req)}
                                    >
                                        <MaterialIcons name="close" size={20} color={Colors.white} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Existing Categories */}
                {filteredCategories.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <MaterialIcons name="category" size={48} color={Colors.gray300} />
                        <Text style={styles.emptyText}>No categories found</Text>
                    </View>
                ) : (
                    filteredCategories.map(cat => (
                        <View key={cat.id} style={styles.card}>
                            <View style={styles.cardLeft}>
                                <View style={[styles.iconWrap, { backgroundColor: getIconBgColor(cat.name) }]}>
                                    <MaterialIcons name={cat.icon || 'category'} size={24} color={getIconColor(cat.name)} />
                                </View>
                                <View>
                                    <Text style={styles.catName}>{cat.name}</Text>
                                    <Text style={styles.catItems}>{cat.itemCount} items</Text>
                                </View>
                            </View>
                            <View style={styles.cardActions}>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleEditCategory(cat)}>
                                    <MaterialIcons name="edit" size={20} color={Colors.gray500} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDeleteCategory(cat)}>
                                    <MaterialIcons name="delete" size={20} color={Colors.gray500} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Custom Modal for Add/Edit (Android compatibility) */}
            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalContainer}>
                        <Text style={styles.modalTitle}>
                            {modalType === 'add' ? 'Add Category' : 'Edit Category'}
                        </Text>
                        <Text style={styles.modalSubtitle}>
                            {modalType === 'add' ? 'Enter new category name' : 'Enter new name for this category'}
                        </Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Category name"
                            value={modalInput}
                            onChangeText={setModalInput}
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnSubmit]}
                                onPress={handleModalSubmit}
                            >
                                <Text style={styles.modalBtnSubmitText}>
                                    {modalType === 'add' ? 'Add' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8faf9' },
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
        backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.gray100,
    },
    backBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
    headerTitleWrap: { alignItems: 'center' },
    headerSubtitle: { fontSize: 10, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, marginBottom: 2 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textMain },
    addBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: Colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
    },
    searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', height: 48, borderRadius: 12,
        backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.gray200,
    },
    searchInput: { flex: 1, fontSize: 14, marginLeft: 8, marginRight: 14, color: Colors.textMain },
    listHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingBottom: 12,
    },
    listTitle: { fontSize: 12, fontWeight: '700', color: Colors.gray500, letterSpacing: 1 },
    countBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    countText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
    list: { paddingHorizontal: 20 },
    card: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderRadius: 16, backgroundColor: Colors.white,
        borderWidth: 1, borderColor: Colors.gray100, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    catName: { fontSize: 16, fontWeight: '700', color: Colors.textMain },
    catItems: { fontSize: 12, color: Colors.gray500, marginTop: 2 },
    cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    emptyWrap: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 14, color: Colors.gray400, marginTop: 8 },

    // Modal Styles
    modalOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center', padding: 20
    },
    modalContainer: {
        width: '100%', backgroundColor: Colors.white, borderRadius: 16,
        padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1, shadowRadius: 12, elevation: 8
    },
    modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMain, marginBottom: 4 },
    modalSubtitle: { fontSize: 13, color: Colors.gray500, marginBottom: 20 },
    modalInput: {
        backgroundColor: Colors.gray100, borderRadius: 12, paddingHorizontal: 16,
        paddingVertical: 14, fontSize: 16, color: Colors.textMain, marginBottom: 24
    },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    modalBtnCancel: { backgroundColor: Colors.gray100 },
    modalBtnCancelText: { color: Colors.textMain, fontWeight: '600', fontSize: 15 },
    modalBtnSubmit: { backgroundColor: Colors.primary },
    modalBtnSubmitText: { color: Colors.white, fontWeight: '700', fontSize: 15 },

    // Pending requests styles
    pendingSection: {
        marginBottom: 20,
    },
    pendingHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    pendingTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#b45309',
        letterSpacing: 1,
    },
    pendingCountBadge: {
        backgroundColor: '#fef3c7',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pendingCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#b45309',
    },
    pendingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#fffbeb',
        borderWidth: 1,
        borderColor: '#fde68a',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    pendingCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    pendingIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#fef3c7',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pendingCatName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.textMain,
    },
    pendingVendorName: {
        fontSize: 11,
        color: Colors.gray500,
        marginTop: 2,
    },
    pendingActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    approveBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#16a34a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
