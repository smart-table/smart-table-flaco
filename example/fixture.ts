interface Name {
    last: string;
    first: string;
}

export enum Job {
    'DEV' = 'dev',
    'QA' = 'qa',
    'MANAGER' = 'manager'
}

export interface User {
    name: Name;
    job: Job;
    birthDate: Date;
    balance: number;
}

const firstNames = ['Laurent', 'Charlie', 'Elsa', 'Bob', 'Blandine', 'Raymond', 'Jade', 'Athanase', 'Antoine', 'Benjamin', 'Solenne', 'Alice', 'Boris', 'Cedric', 'Camille', 'Isabelle', 'Olivier', 'Nicolas', 'Amaury', 'Odile'];

const lastNames = ['Renard', 'Dupraz', 'Dupont', 'Leponge', 'Robin', 'Blasec', 'Verton', 'Albert', 'Vian', 'Bertin', 'Chevalier', 'Romus', 'Cassare', 'Jourdin', 'Lazarus', 'Blanc', 'Vacon', 'Boulus', 'Giroux', 'Marcelin'];

const jobs = [Job.DEV, Job.QA, Job.MANAGER];

const items: User[] = [];

for (let i = 0; i < 100000; i++) {
    items.push({
        name: {
            first: firstNames[Math.floor(Math.random() * 20)],
            last: lastNames[Math.floor(Math.random() * 20)]
        },
        birthDate: new Date(Math.floor(Math.random() * 1000 * 3600 * 24 * 365 * 50)),
        balance: Math.floor(Math.random() * 5000),
        job: jobs[Math.floor(Math.random() * 3)]
    });
}

export const users = items;
