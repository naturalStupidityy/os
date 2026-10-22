/* Assignment 2: CPU Scheduling Algorithms
 * FCFS, SJF (non-preemptive), Round Robin, Priority (non-preemptive)
 */
#include <stdio.h>
#include <stdlib.h>

#define MAX 20

typedef struct {
    int pid, burst, arrival, priority;
    int waiting, turnaround, completion, remaining;
} Process;

static Process p[MAX], orig[MAX];
static int n;

static void sort_by_arrival(Process a[], int count) {
    for (int i = 0; i < count - 1; i++)
        for (int j = 0; j < count - i - 1; j++)
            if (a[j].arrival > a[j+1].arrival) {
                Process t = a[j]; a[j] = a[j+1]; a[j+1] = t;
            }
}

static void fcfs(void) {
    sort_by_arrival(p, n);
    int time = 0;
    for (int i = 0; i < n; i++) {
        if (time < p[i].arrival) time = p[i].arrival;
        p[i].waiting = time - p[i].arrival;
        time += p[i].burst;
        p[i].completion = time;
        p[i].turnaround = p[i].waiting + p[i].burst;
    }
}

static void sjf(void) {
    int done = 0, time = 0;
    int completed[MAX] = {0};
    while (done < n) {
        int shortest = -1;
        for (int i = 0; i < n; i++)
            if (!completed[i] && p[i].arrival <= time)
                if (shortest == -1 || p[i].burst < p[shortest].burst)
                    shortest = i;
        if (shortest == -1) { time++; continue; }
        p[shortest].waiting = time - p[shortest].arrival;
        time += p[shortest].burst;
        p[shortest].completion = time;
        p[shortest].turnaround = p[shortest].waiting + p[shortest].burst;
        completed[shortest] = 1;
        done++;
    }
}

static void round_robin(int quantum) {
    for (int i = 0; i < n; i++) p[i].remaining = p[i].burst;
    int time = 0, done = 0;
    while (done < n) {
        int idle = 1;
        for (int i = 0; i < n; i++) {
            if (p[i].remaining > 0 && p[i].arrival <= time) {
                idle = 0;
                int run = (p[i].remaining < quantum) ? p[i].remaining : quantum;
                time += run;
                p[i].remaining -= run;
                if (p[i].remaining == 0) {
                    p[i].turnaround = time - p[i].arrival;
                    p[i].waiting = p[i].turnaround - p[i].burst;
                    p[i].completion = time;
                    done++;
                }
            }
        }
        if (idle) time++;
    }
}

static void priority_sched(void) {
    int done = 0, time = 0;
    int completed[MAX] = {0};
    while (done < n) {
        int best = -1;
        for (int i = 0; i < n; i++)
            if (!completed[i] && p[i].arrival <= time)
                if (best == -1 || p[i].priority < p[best].priority)
                    best = i;
        if (best == -1) { time++; continue; }
        p[best].waiting = time - p[best].arrival;
        time += p[best].burst;
        p[best].completion = time;
        p[best].turnaround = p[best].waiting + p[best].burst;
        completed[best] = 1;
        done++;
    }
}

static void reset(void) {
    for (int i = 0; i < n; i++) p[i] = orig[i];
}

static void print_table(void) {
    printf("\nPID\tArrival\tBurst\tPriority\tWaiting\tTurnaround\tCompletion\n");
    for (int i = 0; i < n; i++)
        printf("%d\t%d\t%d\t%d\t\t%d\t%d\t\t%d\n",
               p[i].pid, p[i].arrival, p[i].burst, p[i].priority,
               p[i].waiting, p[i].turnaround, p[i].completion);
    float avg_w = 0, avg_t = 0;
    for (int i = 0; i < n; i++) { avg_w += p[i].waiting; avg_t += p[i].turnaround; }
    printf("Average waiting time:    %.2f\n", avg_w / n);
    printf("Average turnaround time: %.2f\n", avg_t / n);
}

int main(void) {
    printf("Enter number of processes: ");
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX) { printf("Invalid\n"); return 1; }
    for (int i = 0; i < n; i++) {
        p[i].pid = i + 1;
        printf("Process %d - arrival burst priority: ", i + 1);
        scanf("%d %d %d", &p[i].arrival, &p[i].burst, &p[i].priority);
        orig[i] = p[i];
    }
    int choice;
    while (1) {
        reset();
        printf("\n--- Scheduling Algorithms ---\n");
        printf("1. FCFS\n");
        printf("2. SJF (non-preemptive)\n");
        printf("3. Round Robin\n");
        printf("4. Priority (non-preemptive)\n");
        printf("5. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        switch (choice) {
            case 1: fcfs();          print_table(); break;
            case 2: sjf();           print_table(); break;
            case 3: { int q;
                      printf("Time quantum: ");
                      scanf("%d", &q);
                      round_robin(q);
                      print_table(); break; }
            case 4: priority_sched(); print_table(); break;
            case 5: exit(0);
            default: printf("Invalid choice\n");
        }
    }
    return 0;
}
