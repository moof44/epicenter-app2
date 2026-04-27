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
} from '@angular/fire/firestore';
import { Observable, shareReplay } from 'rxjs';
import { Product } from '../models/store.model';
import { AuthService } from './auth.service';
import { createConverter } from '../utils/firestore-converter.utils';

@Injectable({
    providedIn: 'root',
})
export class ProductService {
    private firestore = inject(Firestore);
    private authService = inject(AuthService);
    private productsCollection = collection(this.firestore, 'products').withConverter(
        createConverter<Product>()
    );

    private get _currentUserSnapshot() {
        const user = this.authService.userProfile();
        if (!user) throw new Error('Action requires authentication');
        return {
            uid: user.uid,
            name: user.displayName,
            timestamp: new Date(),
        };
    }

    private readonly products$ = (() => {
        const q = query(this.productsCollection, orderBy('name'), limit(100));
        return collectionData(q).pipe(shareReplay({ bufferSize: 1, refCount: false }));
    })();

    getProducts(limitCount = 100): Observable<Product[]> {
        if (limitCount !== 100) {
            const q = query(this.productsCollection, orderBy('name'), limit(limitCount));
            return collectionData(q);
        }
        return this.products$;
    }

    async getProductsPage(
        limitCount = 50,
        lastDoc?: QueryDocumentSnapshot<Product>
    ): Promise<{
        products: Product[];
        lastDoc: QueryDocumentSnapshot<Product> | null;
    }> {
        let q = query(this.productsCollection, orderBy('name'), limit(limitCount));

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const snapshot = await getDocs(q);
        const products = snapshot.docs.map((d) => d.data());
        const lastDocument =
            snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;

        return { products, lastDoc: lastDocument };
    }

    getProduct(id: string): Observable<Product | undefined> {
        const docRef = doc(this.firestore, 'products', id).withConverter(
            createConverter<Product>()
        );
        return docData(docRef);
    }

    addProduct(product: Omit<Product, 'id'>): Promise<any> {
        const trace = this._currentUserSnapshot;
        return addDoc(this.productsCollection, {
            ...product,
            lastModifiedBy: trace,
        } as Product);
    }

    updateProduct(id: string, data: Partial<Product>): Promise<void> {
        const docRef = doc(this.firestore, 'products', id).withConverter(
            createConverter<Product>()
        );
        const trace = this._currentUserSnapshot;
        return updateDoc(docRef, { ...data, lastModifiedBy: trace });
    }

    deleteProduct(id: string): Promise<void> {
        const docRef = doc(this.firestore, 'products', id);
        return deleteDoc(docRef);
    }
}
