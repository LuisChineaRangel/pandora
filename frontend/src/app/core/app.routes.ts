import { NgModule } from '@angular/core';
import { RouterModule, RouterOutlet, Routes } from '@angular/router';

import { DocsComponent } from '@app/components/docs/docs.component';
import { SimulationComponent } from '@components/simulation/simulation.component';
import { AttacksComponent } from '@components/attacks/attacks.component';

export const routes: Routes = [
    { path: '', redirectTo: '/simulation', pathMatch: 'full' },
    { path: 'simulation', component: SimulationComponent },
    { path: 'attacks', component: AttacksComponent },
    { path: 'docs', component: DocsComponent },
];

@NgModule({
    imports: [RouterModule],
    exports: [RouterModule, RouterOutlet],
})
export class AppRoutingModule { }
