import { Injectable, inject } from '@angular/core';
import {
    Firestore,
    collection,
    collectionData,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    docData,
    limit,
    getDocs,
    startAfter,
    QueryDocumentSnapshot,
    DocumentData,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Product } from '../models/store.model';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root',
})
export class ProductService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private productsCollection = collection(this.firestore, 'products');

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName,
            timestamp: new Date(),
        };
    }

    getProducts(limitCount = 100): Observable<Product[]> {
        const q = query(this.productsCollection, orderBy('name'), limit(limitCount));
        return collectionData(q, { idField: 'id' }) as Observable<Product[]>;
    }

    async getProductsPage(
        limitCount = 50,
        lastDoc?: QueryDocumentSnapshot<DocumentData>
    ): Promise<{
        products: Product[];
        lastDoc: QueryDocumentSnapshot<DocumentData> | null;
    }> {
        let q = query(this.productsCollection, orderBy('name'), limit(limitCount));

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const products = snapshot.docs.map(
            (d) => ({ id: d.id, ...d.data() }) as Product
        );
        const lastDocument =
            snapshot.docs.length > 0
                ? snapshot.docs[snapshot.docs.length - 1]
                : null;

        return { products, lastDoc: lastDocument };
    }

    getProduct(id: string): Observable<Product> {
        const docRef = doc(this.firestore, 'products', id);
        return docData(docRef, { idField: 'id' }) as Observable<Product>;
    }

    addProduct(product: Omit<Product, 'id'>): Promise<any> {
        const trace = this._currentUserSnapshot;
        return addDoc(this.productsCollection, {
            ...product,
            lastModifiedBy: trace,
        });
    }

    updateProduct(id: string, data: Partial<Product>): Promise<void> {
        const docRef = doc(this.firestore, 'products', id);
        const trace = this._currentUserSnapshot;
        return updateDoc(docRef, { ...data, lastModifiedBy: trace });
    }

    deleteProduct(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'products', id);
        return deleteDoc(docRef);
    }
}
