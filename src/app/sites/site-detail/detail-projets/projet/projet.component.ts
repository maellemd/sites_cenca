import { Component, OnInit, ChangeDetectorRef, inject, Inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';

import { Operation } from './operation/operations';
import { ProjetLite, Projet } from '../projets';
import { ProjetService } from '../projets.service';
import { FormService } from '../../../../services/form.service';

import { DetailGestionComponent } from '../../detail-gestion/detail-gestion.component'; 
import { FormButtonsComponent } from '../../../../shared/form-buttons/form-buttons.component';

import { MatDialog, MatDialogModule, MatDialogTitle, MatDialogContent, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { MatFormFieldModule } from '@angular/material/form-field';

import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule, StepperOrientation } from '@angular/material/stepper';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';

import { MatInputModule } from '@angular/material/input'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatDatepickerIntl, MatDatepickerModule} from '@angular/material/datepicker';
import { MatNativeDateModule, MAT_DATE_LOCALE, DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { provideMomentDateAdapter } from '@angular/material-moment-adapter';
import 'moment/locale/fr';

import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { BreakpointObserver } from '@angular/cdk/layout';

import { OperationComponent } from './operation/operation.component';
import { MapComponent } from '../../../../map/map.component';

import { Projection } from 'leaflet';
// NE PAS oublier de décommenter la
import { Subscription } from 'rxjs';


// Configuration des formats de date
export const MY_DATE_FORMATS = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-dialog-operation',
  standalone: true,
  providers: [
    {provide: MAT_DATE_LOCALE, useValue: 'fr-FR'},

    // Moment can be provided globally to your app by adding `provideMomentDateAdapter`
    // to your app config. We provide it at the component level here, due to limitations
    // of our example generation script.
    provideMomentDateAdapter(),

    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: {displayDefaultIndicatorType: false},
    },
  ],
  imports: [
    FormButtonsComponent,
    DetailGestionComponent,
    CommonModule,
    MapComponent,
    MatDialogModule,
    MatDialogTitle,
    MatDialogContent,
    MatIconModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTableModule,
    AsyncPipe // Ajouté pour le spinner
    ,
    OperationComponent
],
  templateUrl: './projet.component.html',
  styleUrls: ['./projet.component.scss'], // Correct 'styleUrl' to 'styleUrls'
})
export class ProjetComponent implements OnInit, OnDestroy  { // Implements OnInit to use the lifecycle method
  private readonly _adapter = inject<DateAdapter<unknown, unknown>>(DateAdapter);
  private readonly _intl = inject(MatDatepickerIntl);
  private readonly _locale = signal(inject<unknown>(MAT_DATE_LOCALE));
  readonly dateFormatString = this._locale() === 'fr';

  projetLite: ProjetLite;
  projet!: Projet;
  isLoading: boolean = true;  // Initialisation à 'true' pour activer le spinner
  loadingDelay: number = 300;
  
  isEditProjet: boolean = false;
  isEditOperation: boolean = false; // Si on doit cacher le stepper pour voir le composant operation

  projetForm!: FormGroup;
  isFormValid: boolean = false;
  initialFormValues!: FormGroup; // Propriété pour stocker les valeurs initiales du formulaire principal
  private formStatusSubscription: Subscription | null = null;
  
  stepperOrientation: Observable<StepperOrientation>;
  
  constructor(
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private formService: FormService,
    private research: ProjetService,
    @Inject(MAT_DIALOG_DATA) public data: ProjetLite, // Inject MAT_DIALOG_DATA to access the passed data
    ) {
      // Données en entrée provenant de la liste simple des projets tous confondus
      this.projetLite = data;
      // console.log("data : ");
      // console.log(data);

      // Sert pour le stepper
      const breakpointObserver = inject(BreakpointObserver);
      this.stepperOrientation = breakpointObserver.observe('(min-width: 800px)').pipe(map(({matches}) => (matches ? 'horizontal' : 'vertical')));

      // console.log("this.projetLite dans le dialog :", this.projetLite);
    }

  async ngOnInit() {
    // Initialiser les valeurs du formulaire principal quand on le composant a fini de s'initialiser
    // console.log('Initialisation du formulaire principal');
    let subroute: string = "";
    
    if (this.projetLite?.uuid_proj) {
      try {
        // Simuler un délai artificiel
        setTimeout(async () => {
          subroute = `projets/uuid=${this.projetLite.uuid_proj}/full`; // Full puisque UN SEUL projet
          console.log("Récupération des données du projet avec l'UUID du projet :" + this.projetLite.uuid_proj);
          const projetObject = await this.research.getProjet(subroute);
          // console.log("-------------------- Données du Projet : ");
          // console.log(projetObject);

          // Accéder données du projet
          if (projetObject.uuid_proj) {
            this.projet = projetObject; // Assigner l'objet projet directement
            console.log('Projet après extraction :', this.projet);

            // Les form_groups correspondant aux steps
            // Sert a defini les valeurs par defaut et si obligatoire
            this.projetForm = this.fb.group({
              type: [this.projet.typ_projet || '', Validators.required],
              nom: [this.projet.nom || '', Validators.required],
              code: [this.projet.code || '', Validators.required],
              responsable: [this.projet.code || '', Validators.required],
              pro_maitre_ouvrage: [this.projet.pro_maitre_ouvrage || '',],
              pro_debut: [this.projet.pro_debut || '', ],
              pro_fin: [this.projet.pro_fin || '', ],
              statut: [this.projet.statut || '', ],
              pro_obj_projet: [this.projet.pro_obj_projet || '',],
              surface: [this.projet.pro_surf_totale || '', ],
              pro_enjeux_eco: [this.projet.pro_enjeux_eco || '', ],
              pro_nv_enjeux: [this.projet.pro_nv_enjeux || '', ],
              pro_pression_ciblee: [this.projet.pro_pression_ciblee || '', ],
              pro_results_attendus: [this.projet.pro_results_attendus || '', ],
              pro_obj_ope: [this.projet.pro_obj_ope || '', ]
            });

            // Souscrire aux changements du statut du formulaire principal (projetForm)
            this.formStatusSubscription = this.projetForm.statusChanges.subscribe(status => {
              this.isFormValid = this.projetForm.valid;  // Mettre à jour isFormValid en temps réel
              // console.log('Statut du formulaire principal :', status);
              // console.log("this.isFormValid = this.projetForm.valid :");
              // console.log(this.isFormValid + " = " + this.projetForm.valid);
              // console.log("isFormValid passé à l'enfant:", this.isFormValid);
              this.cdr.detectChanges();  // Forcer la détection des changements dans le parent
            });

            this.isLoading = false;  // Le chargement est terminé
            
          }
        }, this.loadingDelay);
      } catch (error) {
        console.error('Erreur lors de la récupération des données du projet', error);
        this.isLoading = false;  // Même en cas d'erreur, arrêter le spinner
        this.cdr.detectChanges();
      }
    } else {
      console.log("Pas de projet à afficher");
      console.log(this.projetLite);
    }
  }

  ngOnDestroy(): void {
    // Désabonnement lors de la destruction du composant
    if (this.formStatusSubscription) {
      this.formStatusSubscription.unsubscribe();
    }
    console.log('Destruction du composant, on se désabonne.');
  }

  onSelect(operation: Operation): void {
    // Sert à quand on clic sur une ligne du tableau pour rentrer dans le detail d'un projet.
    // L'OPERATION SELECTIONNE PAR L'UTILISATEUR dans la variable ope

    // Ca se passe dans la vue du component dialog-operation
    if(operation.uuid_ope !== undefined){
      // OUVRIR LA FENETRE DE DIALOGUE
      this.openDialog(operation);
    }else{
      console.log("Pas de d'opération sur ce projet : " + operation.titre);
    }
  }

  // Pour l'affichage de la fenetre de dialogue
  dialog = inject(MatDialog);
  openDialog(operation: Operation): void {
    let dialogComponent: any = OperationComponent;

    this.dialog.open(dialogComponent, {
      data : operation
    });
  }

  toggleEditProjet(): void {
    this.isEditProjet = this.formService.toggleEditMode(this.projetForm, this.isEditProjet, this.initialFormValues);
    this.cdr.detectChanges(); // Forcer la détection des changements
  }

  toggleEdit(bool: boolean, force: boolean = false): void {
    // Pour ajouter une opération dans le template

    // Logique de basculement du booleen 
    // Trop simple pour l'instant je garde au cas où
    if (!force) { // Si on force pas le changement
      // Inverser la valeur du booléen
      bool = this.formService.simpleToggle(bool);
    } else {
      // Sinon, forcer le changement de la valeur du booléen
      bool = force;
    }
    this.cdr.detectChanges(); // Forcer la détection des changements
  }

  handleEditModeChange(isEditFromOperation: boolean): void {
    console.log('handleEditModeChange:', isEditFromOperation);
    this.isEditOperation = isEditFromOperation;
    console.log('Mode édition changé:', this.isEditOperation);
  }

  getInvalidFields(): string[] {
    return this.formService.getInvalidFields(this.projetForm);
  }

  onSubmit(): void {
    // Logique de soumission du formulaire global
    if (this.projetForm.valid) {
      console.log(this.projetForm.value);
    } else {
      console.error('Le formulaire principal est invalide');
    }
  }
}
