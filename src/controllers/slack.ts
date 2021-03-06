import { Event, EventStatus } from '../entity/Event';
import { service } from '../services/slackService';
import { viewBienvenida, viewEnviarEvento } from '../resources/views';
import { ActionHandler, Respond } from '@slack/interactive-messages';
import { View, SectionBlock, PlainTextElement, ChatMeMessageArguments, ChatPostMessageArguments } from '@slack/web-api';
import { connection } from '../database/eventsDB';
import { Repository } from 'typeorm';
import { mensajeSolicitudPublicacion } from '../resources/messageBlocks';

function mencion(args: any) {
    service.getWebClient().chat.postMessage({ channel: args['channel'], text: 'Hola!' });
}

function hablarConBot(args: any) {
    service.getWebClient().chat.postMessage({ channel: args['channel'], text: 'Hola! Soy el bot de gestión del Comité de Comunicación (ComCom). Para solicitar que difundamos un evento, utiliza el acceso directo /enviar_evento.' });
}

function bienvenida(args: any) {
    var viewModificada = Object.assign({}, viewBienvenida); // Hacemos una copia de la View original, y la personalizamos para el usuario
    (<SectionBlock>viewModificada.blocks.find(view => view.type === 'section')).text = <PlainTextElement>(<unknown>('¡Hola <@' + args['user'] + '>! Soy el *Gestor de ComCom*. Habla conmigo para pedirle al Comité de Comunicación que difundan tus eventos. Tienes dos formas de hacerlo:'));
    service.getWebClient().views.publish({ view: viewBienvenida, user_id: args['user'] });
}

function enviarEvento(payload: any, respond: Respond): any {
    service.getWebClient().views.open({ trigger_id: payload['trigger_id'], view: viewEnviarEvento });
    /*respond({
        text: "Thanks for your request, we'll process it and get back to you.",
        response_type: "ephemeral"
    }).catch((err) => console.error(err)).then((result) => console.log(result));*/
}

function enviarEventoShortcut(payload: any): any {
    service.getWebClient().views.open({ trigger_id: payload['trigger_id'], view: viewEnviarEvento });
}

function enviarEventoSubmit(payload: any): Promise<any> {

    const valoresForm = payload['view']['state']['values'];

    const evento: Event = new Event();
    evento.date = new Date(valoresForm['date']['date-action']['selected_date']);
    evento.name = valoresForm['name']['name-action']['value'];
    evento.contact = valoresForm['contact']['contact-action']['selected_conversation'];
    evento.description = valoresForm['description']['description-action']['value'];
    evento.userSubmitted = payload['user']['id'];
    evento.status = EventStatus.PENDIENTE_DE_APROBAR;

    if (evento.date < new Date()) { // La fecha en la que se pide el evento es menor que la actual
        return (Promise.resolve({
            "response_action": "errors", "errors": {
                "date": "La fecha no puede estar en el pasado"
            }
        }));
    }

    const repo: Repository<Event> = connection.getRepository(Event);
    repo.save([evento]).then(evento => console.info('Insertado el evento ' + evento[0].id + ', con nombre ' + evento[0].name)).catch((err) => console.error('Error insertando el evento. Error: ', err));

    enviarMensajeSolicitudPublicacion(evento);

    return (Promise.resolve({
    }));
}

async function enviarMensajeSolicitudPublicacion(evento: Event) {
    const msg: ChatPostMessageArguments = { channel: evento.contact, text: "Mensaje de prueba", blocks: mensajeSolicitudPublicacion };
    service.getWebClient().chat.postMessage(msg).then((res) => console.info("Publicado el mensaje correctamente")).catch((err) => console.error("Error para publicar el mensaje"));
}

export { mencion, enviarEvento, hablarConBot, bienvenida, enviarEventoShortcut, enviarEventoSubmit };