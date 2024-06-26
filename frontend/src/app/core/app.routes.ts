import { NgModule } from '@angular/core';
import { RouterModule, RouterOutlet, Routes } from '@angular/router';

import { HomeComponent } from '@components/home/home.component';
import { SimulationComponent } from '@components/simulation/simulation.component';

export const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'simulation', component: SimulationComponent },
];

@NgModule({
    imports: [RouterModule],
    exports: [RouterModule, RouterOutlet],
})
export class AppRoutingModule { }
