/**
 * 西北保全勤務管理系統 - 資料管理器
 * 提供統一的資料存取介面
 */

import { db } from './firebase.js';
import { systemCache, systemLogger, systemNetwork } from './system.js';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    startAfter,
    serverTimestamp,
    Timestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * 資料管理器基類
 */
export class DataManager {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.collectionRef = collection(db, collectionName);
        this.listeners = new Map();
        systemLogger.debug(`DataManager initialized for ${collectionName}`);
    }
    
    /**
     * 取得文件
     */
    async getDocument(id, useCache = true) {
        try {
            const cacheKey = `${this.collectionName}_${id}`;
            
            if (useCache) {
                const cached = systemCache.get(cacheKey);
                if (cached) return cached;
            }
            
            systemLogger.debug(`Fetching document: ${cacheKey}`);
            const docRef = doc(this.collectionRef, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Document not found');
            }
            
            const data = { id: docSnap.id, ...docSnap.data() };
            
            // 快取資料
            systemCache.set(cacheKey, data);
            
            return data;
        } catch (error) {
            systemLogger.error(`Error getting document ${id}`, error);
            throw error;
        }
    }
    
    /**
     * 取得多個文件
     */
    async getDocuments(conditions = [], orderByField = null, orderDirection = 'asc', limitCount = null, useCache = true) {
        try {
            const cacheKey = `${this.collectionName}_query_${JSON.stringify({ conditions, orderByField, orderDirection, limitCount })}`;
            
            if (useCache) {
                const cached = systemCache.get(cacheKey);
                if (cached) return cached;
            }
            
            systemLogger.debug(`Fetching documents with conditions`, { conditions, orderByField, orderDirection, limitCount });
            
            let q = this.collectionRef;
            
            // 加入條件
            conditions.forEach(condition => {
                q = query(q, where(condition.field, condition.operator, condition.value));
            });
            
            // 加入排序
            if (orderByField) {
                q = query(q, orderBy(orderByField, orderDirection));
            }
            
            // 加入限制
            if (limitCount) {
                q = query(q, limit(limitCount));
            }
            
            const querySnapshot = await getDocs(q);
            const documents = [];
            
            querySnapshot.forEach(doc => {
                documents.push({ id: doc.id, ...doc.data() });
            });
            
            // 快取資料
            systemCache.set(cacheKey, documents);
            
            return documents;
        } catch (error) {
            systemLogger.error(`Error getting documents`, error);
            throw error;
        }
    }
    
    /**
     * 新增文件
     */
    async addDocument(data, customId = null) {
        try {
            systemLogger.debug(`Adding document to ${this.collectionName}`, data);
            
            const documentData = {
                ...data,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };
            
            let docRef;
            if (customId) {
                docRef = doc(this.collectionRef, customId);
                await setDoc(docRef, documentData);
            } else {
                docRef = await addDoc(this.collectionRef, documentData);
            }
            
            // 清除相關快取
            this.clearCache();
            
            return docRef.id;
        } catch (error) {
            systemLogger.error(`Error adding document`, error);
            throw error;
        }
    }
    
    /**
     * 更新文件
     */
    async updateDocument(id, data) {
        try {
            systemLogger.debug(`Updating document ${id}`, data);
            
            const docRef = doc(this.collectionRef, id);
            const updateData = {
                ...data,
                updatedAt: serverTimestamp()
            };
            
            await updateDoc(docRef, updateData);
            
            // 清除相關快取
            this.clearCache(id);
            
            return true;
        } catch (error) {
            systemLogger.error(`Error updating document ${id}`, error);
            throw error;
        }
    }
    
    /**
     * 刪除文件
     */
    async deleteDocument(id) {
        try {
            systemLogger.debug(`Deleting document ${id}`);
            
            const docRef = doc(this.collectionRef, id);
            await deleteDoc(docRef);
            
            // 清除相關快取
            this.clearCache(id);
            
            return true;
        } catch (error) {
            systemLogger.error(`Error deleting document ${id}`, error);
            throw error;
        }
    }
    
    /**
     * 監聽文件變更
     */
    subscribeToDocument(id, callback) {
        try {
            const docRef = doc(this.collectionRef, id);
            const unsubscribe = onSnapshot(docRef, (doc) => {
                if (doc.exists()) {
                    const data = { id: doc.id, ...doc.data() };
                    callback(data);
                    
                    // 更新快取
                    const cacheKey = `${this.collectionName}_${id}`;
                    systemCache.set(cacheKey, data);
                } else {
                    callback(null);
                }
            });
            
            // 儲存監聽器以便後續清除
            this.listeners.set(`doc_${id}`, unsubscribe);
            
            return unsubscribe;
        } catch (error) {
            systemLogger.error(`Error subscribing to document ${id}`, error);
            throw error;
        }
    }
    
    /**
     * 監聽集合變更
     */
    subscribeToCollection(conditions = [], callback) {
        try {
            let q = this.collectionRef;
            
            // 加入條件
            conditions.forEach(condition => {
                q = query(q, where(condition.field, condition.operator, condition.value));
            });
            
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const documents = [];
                querySnapshot.forEach(doc => {
                    documents.push({ id: doc.id, ...doc.data() });
                });
                callback(documents);
            });
            
            // 儲存監聽器以便後續清除
            const listenerKey = `collection_${JSON.stringify(conditions)}`;
            this.listeners.set(listenerKey, unsubscribe);
            
            return unsubscribe;
        } catch (error) {
            systemLogger.error(`Error subscribing to collection`, error);
            throw error;
        }
    }
    
    /**
     * 清除快取
     */
    clearCache(specificId = null) {
        if (specificId) {
            systemCache.delete(`${this.collectionName}_${specificId}`);
        } else {
            // 清除所有與此集合相關的快取
            const keysToDelete = [];
            for (const key of systemCache.cache.keys()) {
                if (key.startsWith(this.collectionName)) {
                    keysToDelete.push(key);
                }
            }
            keysToDelete.forEach(key => systemCache.delete(key));
        }
    }
    
    /**
     * 清除所有監聽器
     */
    unsubscribeAll() {
        this.listeners.forEach(unsubscribe => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        });
        this.listeners.clear();
        systemLogger.debug(`All listeners unsubscribed for ${this.collectionName}`);
    }
}

/**
 * 使用者資料管理器
 */
export class UserDataManager extends DataManager {
    constructor() {
        super('users');
    }
    
    async getUserByEmail(email) {
        const users = await this.getDocuments([
            { field: 'email', operator: '==', value: email }
        ]);
        return users.length > 0 ? users[0] : null;
    }
    
    async getUsersByRole(role) {
        return await this.getDocuments([
            { field: 'role', operator: '==', value: role }
        ]);
    }
    
    async getActiveUsers() {
        return await this.getDocuments([
            { field: 'status', operator: '==', value: 'active' }
        ]);
    }
}

/**
 * 勤務資料管理器
 */
export class ScheduleDataManager extends DataManager {
    constructor() {
        super('schedules');
    }
    
    async getSchedulesByDateRange(startDate, endDate, userId = null) {
        const conditions = [
            { field: 'date', operator: '>=', value: startDate },
            { field: 'date', operator: '<=', value: endDate }
        ];
        
        if (userId) {
            conditions.push({ field: 'userId', operator: '==', value: userId });
        }
        
        return await this.getDocuments(conditions, 'date', 'asc');
    }
    
    async getCurrentShift(userId) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        
        const schedules = await this.getDocuments([
            { field: 'userId', operator: '==', value: userId },
            { field: 'date', operator: '==', value: today }
        ]);
        
        const currentTime = now.getHours() * 60 + now.getMinutes();
        
        return schedules.find(schedule => {
            const startTime = this.timeToMinutes(schedule.startTime);
            const endTime = this.timeToMinutes(schedule.endTime);
            return currentTime >= startTime && currentTime <= endTime;
        });
    }
    
    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }
}

/**
 * 休假資料管理器
 */
export class LeaveDataManager extends DataManager {
    constructor() {
        super('leaves');
    }
    
    async getLeavesByStatus(status, userId = null) {
        const conditions = [
            { field: 'status', operator: '==', value: status }
        ];
        
        if (userId) {
            conditions.push({ field: 'userId', operator: '==', value: userId });
        }
        
        return await this.getDocuments(conditions, 'createdAt', 'desc');
    }
    
    async getLeavesByDateRange(startDate, endDate, userId = null) {
        const conditions = [
            { field: 'startDate', operator: '>=', value: startDate },
            { field: 'endDate', operator: '<=', value: endDate }
        ];
        
        if (userId) {
            conditions.push({ field: 'userId', operator: '==', value: userId });
        }
        
        return await this.getDocuments(conditions, 'startDate', 'asc');
    }
    
    async getOverlappingLeaves(userId, startDate, endDate, excludeId = null) {
        const conditions = [
            { field: 'userId', operator: '==', value: userId },
            { field: 'status', operator: 'in', value: ['pending', 'approved'] }
        ];
        
        if (excludeId) {
            conditions.push({ field: '__name__', operator: '!=', value: excludeId });
        }
        
        const leaves = await this.getDocuments(conditions);
        
        return leaves.filter(leave => {
            return (startDate <= leave.endDate && endDate >= leave.startDate);
        });
    }
}

/**
 * 定位資料管理器
 */
export class LocationDataManager extends DataManager {
    constructor() {
        super('locations');
    }
    
    async getRecentLocations(userId, limitCount = 10) {
        return await this.getDocuments([
            { field: 'userId', operator: '==', value: userId }
        ], 'timestamp', 'desc', limitCount);
    }
    
    async getLocationsByDateRange(userId, startDate, endDate) {
        return await this.getDocuments([
            { field: 'userId', operator: '==', value: userId },
            { field: 'timestamp', operator: '>=', value: startDate },
            { field: 'timestamp', operator: '<=', value: endDate }
        ], 'timestamp', 'desc');
    }
    
    async getCurrentLocation(userId) {
        const locations = await this.getDocuments([
            { field: 'userId', operator: '==', value: userId }
        ], 'timestamp', 'desc', 1);
        
        return locations.length > 0 ? locations[0] : null;
    }
}

// 匯出實例
export const userDataManager = new UserDataManager();
export const scheduleDataManager = new ScheduleDataManager();
export const leaveDataManager = new LeaveDataManager();
export const locationDataManager = new LocationDataManager();

// 匯出類別以便擴展
export { DataManager, UserDataManager, ScheduleDataManager, LeaveDataManager, LocationDataManager };