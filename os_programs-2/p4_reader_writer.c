/* Assignment 4: Reader-Writer problem with pthreads
 * Demonstrates synchronization with and without locks
 * Compile: gcc -o p4 p4_reader_writer.c -lpthread
 */
#include <stdio.h>
#include <stdlib.h>
#include <pthread.h>
#include <unistd.h>

#define NUM_READERS 3
#define NUM_WRITERS 2

static int data = 0;
static int use_sync = 1;

static pthread_mutex_t mutex    = PTHREAD_MUTEX_INITIALIZER;
static pthread_mutex_t rw_mutex = PTHREAD_MUTEX_INITIALIZER;
static int read_count = 0;

static void *reader(void *arg) {
    int id = *(int *)arg;
    if (use_sync) {
        pthread_mutex_lock(&mutex);
        read_count++;
        if (read_count == 1) pthread_mutex_lock(&rw_mutex);
        pthread_mutex_unlock(&mutex);
    }
    printf("Reader %d: read data = %d\n", id, data);
    usleep(1000);
    if (use_sync) {
        pthread_mutex_lock(&mutex);
        read_count--;
        if (read_count == 0) pthread_mutex_unlock(&rw_mutex);
        pthread_mutex_unlock(&mutex);
    }
    return NULL;
}

static void *writer(void *arg) {
    int id = *(int *)arg;
    if (use_sync) pthread_mutex_lock(&rw_mutex);
    int old = data;
    usleep(1000);
    data = old + 1;
    printf("Writer %d: wrote data = %d\n", id, data);
    if (use_sync) pthread_mutex_unlock(&rw_mutex);
    return NULL;
}

static void run_test(void) {
    pthread_t rt[NUM_READERS], wt[NUM_WRITERS];
    int rids[NUM_READERS], wids[NUM_WRITERS];

    for (int i = 0; i < NUM_READERS; i++) {
        rids[i] = i + 1;
        pthread_create(&rt[i], NULL, reader, &rids[i]);
    }
    for (int i = 0; i < NUM_WRITERS; i++) {
        wids[i] = i + 1;
        pthread_create(&wt[i], NULL, writer, &wids[i]);
    }
    for (int i = 0; i < NUM_READERS; i++) pthread_join(rt[i], NULL);
    for (int i = 0; i < NUM_WRITERS; i++) pthread_join(wt[i], NULL);
}

int main(void) {
    int choice;
    while (1) {
        printf("\n--- Reader-Writer Problem ---\n");
        printf("1. With synchronization\n");
        printf("2. Without synchronization\n");
        printf("3. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        if (choice == 3) exit(0);
        if (choice != 1 && choice != 2) { printf("Invalid\n"); continue; }
        use_sync = (choice == 1);
        data = 0;
        printf("\n--- %s ---\n",
               use_sync ? "WITH synchronization" : "WITHOUT synchronization");
        run_test();
        printf("Final data value: %d (expected %d)\n",
               data, NUM_WRITERS);
    }
    return 0;
}
